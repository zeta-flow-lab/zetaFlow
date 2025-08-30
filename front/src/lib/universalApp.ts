import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { parseAbi } from "viem";
import { getUniversalAppAddress } from "../config/addresses";

const UNIVERSAL_APP_ABI = parseAbi([
    'function sendMessage(bytes receiver, address gasZRC20, bytes data, uint256 gasLimit) external',
    'function sendMessageWithToken(bytes receiver, address tokenZRC20, uint256 amount, bytes data, uint256 gasLimit) external',
    'function executeSwapStep(bytes32 planId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address[] path, uint256 deadline) external',
    'function executeWithdrawStep(bytes32 planId, address token, uint256 amount, bytes receiver, bytes dstCalldata, (address,bool,address,bytes,uint256) revertOptions) external',
    'function executePlan(bytes32 planId) external'
] as const);

export async function sendMessage(
    publicClient: PublicClient,
    walletClient: WalletClient,
    receiver: Hex,
    gasZRC20: Address,
    data: Hex,
    gasLimit: bigint
): Promise<Hex> {
    if (!walletClient?.chain?.id) throw new Error('钱包未连接');
    const app = getUniversalAppAddress(7001);
    if (!app) throw new Error('未配置 Universal App 地址');
    const hash = await walletClient.writeContract({
        abi: UNIVERSAL_APP_ABI,
        address: app as Address,
        functionName: 'sendMessage',
        args: [receiver, gasZRC20, data, gasLimit],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
}

export async function sendMessageWithToken(
    publicClient: PublicClient,
    walletClient: WalletClient,
    receiver: Hex,
    tokenZRC20: Address,
    amount: bigint,
    data: Hex,
    gasLimit: bigint
): Promise<Hex> {
    if (!walletClient?.chain?.id) throw new Error('钱包未连接');
    const app = getUniversalAppAddress(7001);
    if (!app) throw new Error('未配置 Universal App 地址');
    const hash = await walletClient.writeContract({
        abi: UNIVERSAL_APP_ABI,
        address: app as Address,
        functionName: 'sendMessageWithToken',
        args: [receiver, tokenZRC20, amount, data, gasLimit],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
}

export async function executeSwapStep(
    publicClient: PublicClient,
    walletClient: WalletClient,
    planId: Hex,
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    minAmountOut: bigint,
    path: Address[],
    deadline: bigint
): Promise<Hex> {
    const app = getUniversalAppAddress(7001);
    if (!app) throw new Error('未配置 Universal App 地址');
    const hash = await walletClient.writeContract({
        abi: UNIVERSAL_APP_ABI,
        address: app as Address,
        functionName: 'executeSwapStep',
        args: [planId, tokenIn, tokenOut, amountIn, minAmountOut, path, deadline],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
}

export type RevertOptions = {
    revertAddress: Address;
    callOnRevert: boolean;
    abortAddress: Address;
    revertMessage: Hex;
    onRevertGasLimit: bigint;
};

export async function executeWithdrawStep(
    publicClient: PublicClient,
    walletClient: WalletClient,
    planId: Hex,
    token: Address,
    amount: bigint,
    receiver: Hex,
    dstCalldata: Hex,
    revertOptions: RevertOptions
): Promise<Hex> {
    const app = getUniversalAppAddress(7001);
    if (!app) throw new Error('未配置 Universal App 地址');
    const tupleOptions: readonly [Address, boolean, Address, Hex, bigint] = [
        revertOptions.revertAddress,
        revertOptions.callOnRevert,
        revertOptions.abortAddress,
        revertOptions.revertMessage,
        revertOptions.onRevertGasLimit,
    ];
    const hash = await walletClient.writeContract({
        abi: UNIVERSAL_APP_ABI,
        address: app as Address,
        functionName: 'executeWithdrawStep',
        args: [planId, token, amount, receiver, dstCalldata, tupleOptions],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
}

export async function executePlan(
    publicClient: PublicClient,
    walletClient: WalletClient,
    planId: Hex
): Promise<Hex> {
    const app = getUniversalAppAddress(7001);
    if (!app) throw new Error('未配置 Universal App 地址');
    const hash = await walletClient.writeContract({
        abi: UNIVERSAL_APP_ABI,
        address: app as Address,
        functionName: 'executePlan',
        args: [planId],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
}


