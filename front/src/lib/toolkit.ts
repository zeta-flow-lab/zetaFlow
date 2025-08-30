export type { };

import { ethers } from 'ethers';
import { GATEWAY_ABI_FRAGMENTS, getGatewayAddress } from '../config/addresses';

export type ToolkitSigner = ethers.Wallet | ethers.JsonRpcSigner | ethers.BrowserProvider;

export async function depositAndCallViaToolkit(params: {
    signer: ToolkitSigner;
    gateway?: string;
    universal: string;
    data: string;
    amount: string;
    token?: string;
    revertOptions: {
        revertAddress?: string;
        callOnRevert: boolean;
        abortAddress?: string;
        revertMessage: string;
        onRevertGasLimit?: string | number | bigint;
    };
}) {
    const { signer, universal, data, amount, token, revertOptions } = params;
    // 选择网关地址（如果未传入则根据当前网络推断）
    const s = signer instanceof ethers.BrowserProvider ? await signer.getSigner() : (signer as ethers.JsonRpcSigner);
    const network = await s.provider!.getNetwork();
    const gwAddr = params.gateway ?? getGatewayAddress(Number(network.chainId))!;
    const gateway = new ethers.Contract(gwAddr, GATEWAY_ABI_FRAGMENTS, s);

    const isDecimalNumber = /^(?:\d+\.\d+|\d+)$/.test(String(amount));

    if (token && token !== ethers.ZeroAddress) {
        // ERC20 入站：先授权，再 depositAndCall(receiver, amount, asset, payload, revertOptions)
        const erc20 = new ethers.Contract(token, ['function approve(address spender, uint256 value) external returns (bool)'], s);
        const approveTx = await erc20.approve(gwAddr, isDecimalNumber ? ethers.parseEther(String(amount)) : BigInt(amount));
        await approveTx.wait();
        const tx = await gateway.depositAndCall(
            universal,
            isDecimalNumber ? ethers.parseEther(String(amount)) : BigInt(amount),
            token,
            data,
            [
                revertOptions.revertAddress ?? ethers.ZeroAddress,
                revertOptions.callOnRevert,
                revertOptions.abortAddress ?? ethers.ZeroAddress,
                revertOptions.revertMessage,
                BigInt(revertOptions.onRevertGasLimit ?? 0),
            ],
        );
        const receipt = await tx.wait();
        return { txHash: tx.hash, receipt };
    } else {
        // 原生入站：depositAndCall(receiver, payload, revertOptions) payable
        const value = isDecimalNumber ? ethers.parseEther(String(amount)) : BigInt(amount);
        const tx = await gateway.depositAndCall(
            universal,
            data,
            [
                revertOptions.revertAddress ?? ethers.ZeroAddress,
                revertOptions.callOnRevert,
                revertOptions.abortAddress ?? ethers.ZeroAddress,
                revertOptions.revertMessage,
                BigInt(revertOptions.onRevertGasLimit ?? 0),
            ],
            { value }
        );
        const receipt = await tx.wait();
        return { txHash: tx.hash, receipt };
    }
}

export async function callFromZetaViaToolkit(): Promise<never> {
    throw new Error('callFromZetaViaToolkit 暂不支持浏览器环境');
}

const UNIVERSAL_ABI = [
    'function executeSwapStep(bytes32 planId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address[] path, uint256 deadline) external returns ()',
    'function executeWithdrawStep(bytes32 planId, address token, uint256 amount, bytes receiver, bytes dstCalldata, (address,bool,address,bytes,uint256) revertOptions) external returns ()',
    'function withdrawWithGasPrep(address zrc20, uint256 amount, string symbol, address recipient) external',
] as const;

export async function swapViaToolkit(params: {
    signer: ToolkitSigner;
    app: string;
    planId: string; tokenIn: string; tokenOut: string; amountIn: string; minOut: string; path: string[]; deadline: string | number | bigint;
}) {
    const { signer, app, planId, tokenIn, tokenOut, amountIn, minOut, path, deadline } = params;
    const s = signer instanceof ethers.BrowserProvider ? await signer.getSigner() : (signer as ethers.JsonRpcSigner);
    const contract = new ethers.Contract(app, UNIVERSAL_ABI, s);
    const tx = await contract.executeSwapStep(planId, tokenIn, tokenOut, BigInt(amountIn), BigInt(minOut), path, BigInt(deadline));
    const receipt = await tx.wait();
    return { txHash: tx.hash, receipt };
}

export async function withdrawViaToolkit(params: {
    signer: ToolkitSigner;
    app: string;
    planId: string; token: string; amount: string; receiver: string; dstCalldata?: string;
    revertOptions: { revertAddress?: string; callOnRevert: boolean; abortAddress?: string; revertMessage: string; onRevertGasLimit?: string | number | bigint; };
}) {
    const { signer, app, planId, token, amount, receiver, dstCalldata = '0x', revertOptions } = params;

    const s = signer instanceof ethers.BrowserProvider ? await signer.getSigner() : (signer as ethers.JsonRpcSigner);
    const contract = new ethers.Contract(app, UNIVERSAL_ABI, s);
    const receiverBytes = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [receiver]);
    const tx = await contract.executeWithdrawStep(
        planId,
        token,
        BigInt(amount),
        receiverBytes,
        dstCalldata,
        [
            revertOptions.revertAddress ?? ethers.ZeroAddress,
            revertOptions.callOnRevert,
            revertOptions.abortAddress ?? ethers.ZeroAddress,
            revertOptions.revertMessage,
            BigInt(revertOptions.onRevertGasLimit ?? 0),
        ]
    );
    const receipt = await tx.wait();
    return { txHash: tx.hash, receipt };
}

export async function withdrawWithGasPrepViaToolkit(params: {
    signer: ToolkitSigner;
    app: string;
    token: string;
    amount: string;
    symbol: string;
    recipient: string;
}) {
    const { signer, app, token, amount, symbol, recipient } = params;
    const s = signer instanceof ethers.BrowserProvider ? await signer.getSigner() : (signer as ethers.JsonRpcSigner);
    const contract = new ethers.Contract(app, UNIVERSAL_ABI, s);
    const tx = await contract.withdrawWithGasPrep(token, BigInt(amount), symbol, recipient);
    const receipt = await tx.wait();
    return { txHash: tx.hash, receipt };
}
