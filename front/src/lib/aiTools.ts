import { BrowserProvider } from 'ethers';
import { getGatewayAddress, getUniversalAppAddress, getTokenAddress } from '../config/addresses';
import { depositAndCallViaToolkit, withdrawWithGasPrepViaToolkit } from './toolkit';

export async function aiInboundDeposit(opts: {
    srcChainId: number;
    amountEth: string;
    planSymbols: string[];
    planWeights: number[];
}) {
    const { srcChainId, amountEth, planSymbols, planWeights } = opts;
    const universal = getUniversalAppAddress(7001)!;
    const gateway = getGatewayAddress(srcChainId);
    const abi = await import('viem');
    const data = abi.encodeAbiParameters([
        { type: 'string[]' },
        { type: 'uint256[]' }
    ], [planSymbols, planWeights]) as `0x${string}`;

    const browser = new BrowserProvider((window as any).ethereum);
    const signer = await browser.getSigner();

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
    return res;
}

export async function aiWithdrawHalfEth(opts: {
    recipient: string;
}) {
    const universal = getUniversalAppAddress(7001)!;
    const ETHZRC = getTokenAddress(7001, 'ETH')!;

    const browser = new BrowserProvider((window as any).ethereum);
    const signer = await browser.getSigner();

    // 读取合约 ETHZRC 余额
    const { JsonRpcProvider } = await import('ethers');
    const provider = signer.provider as JsonRpcProvider;
    const erc20 = new (await import('ethers')).Contract(
        ETHZRC,
        ['function balanceOf(address) view returns (uint256)'],
        provider
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
    return res;
}


