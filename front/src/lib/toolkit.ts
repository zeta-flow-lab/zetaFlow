export type { };

import { ethers } from 'ethers';

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
    const { signer, gateway, universal, data, amount, token, revertOptions } = params;
    // @ts-ignore: dynamic import of optional dependency types
    const mod = await import('@zetachain/toolkit');
    const res = await (mod as any).evmDepositAndCall({
        receiver: universal,
        amount,
        token,
        types: [],
        values: [],
        data,
        revertOptions,
    }, { signer: signer as any, gateway });
    return res;
}

export async function callFromZetaViaToolkit(params: {
    signer: ToolkitSigner;
    gateway?: string;
    receiver: string;
    zrc20: string;
    functionSignature?: string;
    types?: string[];
    values?: (string | bigint | boolean)[];
    data?: string;
    revertOptions: {
        revertAddress?: string;
        callOnRevert: boolean;
        abortAddress?: string;
        revertMessage: string;
        onRevertGasLimit?: string | number | bigint;
    };
    callOptions: { gasLimit: string | number | bigint; isArbitraryCall?: boolean };
}) {
    const { signer, gateway, receiver, zrc20, functionSignature, types, values, data, revertOptions, callOptions } = params;
    // @ts-ignore: dynamic import of optional dependency types
    const mod = await import('@zetachain/toolkit');
    const res = await (mod as any).evmCall({
        receiver,
        function: functionSignature,
        types,
        values,
        data,
        revertOptions,
        zrc20,
        callOptions,
    }, { signer: signer as any, gateway });
    return res;
}

const UNIVERSAL_ABI = [
    'function executeSwapStep(bytes32 planId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address[] path, uint256 deadline) external returns ()',
    'function executeWithdrawStep(bytes32 planId, address token, uint256 amount, bytes receiver, bytes dstCalldata, (address,bool,address,bytes,uint256) revertOptions) external returns ()',
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

    try {
        // @ts-ignore: dynamic import of optional dependency types
        const mod = await import('@zetachain/toolkit');
        if (typeof (mod as any).evmWithdraw === 'function') {
            const res = await (mod as any).evmWithdraw({
                token: token,
                amount: amount,
                receiver: receiver,
                revertOptions,
            }, { signer: signer as any });
            return res;
        }
    } catch (_e) {
        // ignore
    }

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
