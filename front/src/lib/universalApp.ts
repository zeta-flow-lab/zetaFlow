import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { parseAbi } from "viem";
import { getUniversalAppAddress } from "../config/addresses";

const UNIVERSAL_APP_ABI = parseAbi([
    'function sendMessage(bytes receiver, address gasZRC20, bytes data, uint256 gasLimit) external',
    'function sendMessageWithToken(bytes receiver, address tokenZRC20, uint256 amount, bytes data, uint256 gasLimit) external'
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


