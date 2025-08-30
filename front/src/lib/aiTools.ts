import { BrowserProvider, Contract } from 'ethers';
import { getGatewayAddress, getUniversalAppAddress, getTokenAddress } from '../config/addresses';
import { depositAndCallViaToolkit, withdrawWithGasPrepViaToolkit } from './toolkit';
import { pollCctxBySourceTx, pollCctxByZevmTx } from './cctx';

export async function aiInboundDeposit(opts: {
    srcChainId: number;
    amountEth: string;
    planSymbols: string[];
    planWeights: number[];
}) {
    const { srcChainId, amountEth, planSymbols, planWeights } = opts;
    const eth = (window as any).ethereum;
    if (!eth?.request) throw new Error('未检测到浏览器钱包 (window.ethereum)');
    // 确保已授权站点
    try { await eth.request({ method: 'eth_requestAccounts' }); } catch { }
    const universal = getUniversalAppAddress(7001)!;
    const gateway = getGatewayAddress(srcChainId);
    const abi = await import('viem');
    const weightsBig = planWeights.map((w) => BigInt(w));
    const data = abi.encodeAbiParameters([
        { type: 'string[]' },
        { type: 'uint256[]' }
    ], [planSymbols, weightsBig]) as `0x${string}`;

    const browser = new BrowserProvider((window as any).ethereum);
    const signer = await browser.getSigner();

    // 如果当前不在源链，尝试请求切换到 Sepolia (11155111)，若失败则添加链
    try {
        const net = await signer.provider!.getNetwork();
        if (Number(net.chainId) !== srcChainId && (window as any).ethereum?.request) {
            await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }] // 11155111
            });
        }
    } catch {
        try {
            await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0xaa36a7',
                    chainName: 'Ethereum Sepolia',
                    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://rpc.sepolia.org'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
            });
        } catch { }
    }

    // 记录 ZEVM 当前区块，用于后续从该高度开始查询事件
    const zevmRpc = 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public';
    const { createPublicClient, http, parseAbi } = await import('viem');
    const zevmClient = createPublicClient({ transport: http(zevmRpc) });
    const fromBlock = await zevmClient.getBlockNumber();

    const res = await depositAndCallViaToolkit({
        signer,
        gateway,
        universal,
        data,
        amount: amountEth,
        revertOptions: {
            revertAddress: '0x0000000000000000000000000000000000000000',
            callOnRevert: false,
            abortAddress: universal,
            revertMessage: '0x',
            onRevertGasLimit: 0,
        },
    });

    // 等待 ZEVM 侧 Universal 事件，拿到 ZEVM 交易哈希
    const UNIVERSAL_ABI = parseAbi([
        'event PlanSubmitted(bytes32 indexed planId, address indexed submitter, bytes32 planDataHash)'
    ] as const);
    const appAddr = universal as `0x${string}`;
    let zevmTxHash: string | undefined;
    const deadline = Date.now() + 180000; // 3 分钟
    let cursor = fromBlock;
    while (Date.now() < deadline && !zevmTxHash) {
        try {
            const logs = await zevmClient.getLogs({
                address: appAddr,
                events: [{
                    type: 'event',
                    name: 'PlanSubmitted',
                    inputs: [
                        { indexed: true, name: 'planId', type: 'bytes32' },
                        { indexed: true, name: 'submitter', type: 'address' },
                        { indexed: false, name: 'planDataHash', type: 'bytes32' },
                    ],
                }],
                fromBlock: cursor,
                toBlock: 'latest',
            } as any);
            if (logs && logs.length > 0) {
                // 取最新一条日志的 tx 哈希
                zevmTxHash = (logs[logs.length - 1] as any).transactionHash as string;
                break;
            }
        } catch { }
        // 移动游标并等待
        const latest = await zevmClient.getBlockNumber();
        cursor = latest;
        await new Promise(r => setTimeout(r, 5000));
    }

    const sourceTx = (res as any).txHash || (res as any).hash;
    // 以源链 txHash 轮询 CCTX，获取权威 ZEVM txHash（若可用）
    try {
        const cctx = await pollCctxBySourceTx(sourceTx);
        if (cctx.zevmTxHash) zevmTxHash = cctx.zevmTxHash;
    } catch { }

    return { txHash: sourceTx, zevmTxHash } as any;
}

export async function aiWithdrawHalfEth(opts: {
    recipient: string;
}) {
    const eth = (window as any).ethereum;
    if (!eth?.request) throw new Error('未检测到浏览器钱包 (window.ethereum)');
    try { await eth.request({ method: 'eth_requestAccounts' }); } catch { }
    const universal = getUniversalAppAddress(7001)!;
    const ETHZRC = getTokenAddress(7001, 'ETH')!;

    const browser = new BrowserProvider((window as any).ethereum);
    const signer = await browser.getSigner();

    // 读取合约 ETHZRC 余额
    const erc20 = new Contract(
        ETHZRC,
        ['function balanceOf(address) view returns (uint256)'],
        signer
    );
    const bal: bigint = await erc20.balanceOf(universal);
    if (bal === 0n) throw new Error('Universal 余额为 0，先入站再提现');
    const half = bal / 2n;

    const res = await withdrawWithGasPrepViaToolkit({
        signer,
        app: universal,
        token: ETHZRC,
        amount: String(half),
        symbol: 'ETH',
        recipient: opts.recipient,
    });
    const zevmTx = (res as any).txHash || (res as any).hash;
    // 以 ZEVM txHash 轮询 CCTX，以拿到目标链 txHash
    let destinationTxHash: string | undefined;
    try {
        const cctx = await pollCctxByZevmTx(zevmTx);
        destinationTxHash = cctx.destinationTxHash;
    } catch { }
    return { txHash: zevmTx, destinationTxHash } as any;
}


