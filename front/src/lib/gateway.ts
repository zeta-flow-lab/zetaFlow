/**
 * Gateway 集成库
 * - 连接链：depositAndCall / depositAndCallERC20（将资产与计划发送到 ZetaChain Universal App）
 * - 计划编码：使用 viem 的 encodeAbiParameters 将 JSON 作为 bytes 传递
 * - Allowance：不足时自动 approve
 */

import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { encodeAbiParameters, parseAbi } from "viem";
import { getGatewayAddress, GATEWAY_ABI_FRAGMENTS, ERC20_ABI_FRAGMENTS } from "../config/addresses";
import type { ExecutablePlan } from "./plan-generator";

export interface GatewayTxResult {
    chainId: number;
    hash: Hex;
    receipt?: any;
}

const GATEWAY_ABI = parseAbi(GATEWAY_ABI_FRAGMENTS as readonly string[]);
const ERC20_ABI = parseAbi(ERC20_ABI_FRAGMENTS as readonly string[]);

export class GatewayError extends Error {
    cause?: unknown;
    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = "GatewayError";
        this.cause = cause;
    }
}

// 将计划编码为 bytes（ABI 参数：string）
export function encodePlanCalldata(plan: ExecutablePlan): Hex {
    const json = JSON.stringify({
        intent: plan.intent,
        steps: plan.steps.map((s) => ({
            type: s.type,
            fromToken: s.fromToken,
            toToken: s.toToken,
            amount: s.amount,
            fromChain: s.fromChain,
            toChain: s.toChain,
        })),
        constraints: plan.intent.constraints,
        summary: plan.summary,
    });
    return encodeAbiParameters([{ type: "string" }], [json]);
}

// revert options struct encoding helper
export type RevertOptions = {
    revertAddress: Address;
    callOnRevert: boolean;
    abortAddress: Address;
    revertMessage: Hex;
    onRevertGasLimit: bigint;
};

// 检查并确保 Allowance 充足
export async function ensureAllowance(
    publicClient: PublicClient,
    walletClient: WalletClient,
    token: Address,
    owner: Address,
    spender: Address,
    amount: bigint
): Promise<void> {
    const allowance = (await publicClient.readContract({
        abi: ERC20_ABI,
        address: token,
        functionName: "allowance",
        args: [owner, spender],
    })) as bigint;
    if (allowance >= amount) return;

    const hash = await walletClient.writeContract({
        abi: ERC20_ABI,
        address: token,
        functionName: "approve",
        args: [spender, amount],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
}

// 使用原生代币（如 ETH/BNB）+ 调用
export async function depositPlanWithNative(
    _publicClient: PublicClient,
    walletClient: WalletClient,
    chainId: number,
    universalApp: Address,
    nativeAmountWei: bigint,
    plan: ExecutablePlan,
    revertOptions: RevertOptions
): Promise<GatewayTxResult> {
    if (walletClient.chain?.id !== chainId) {
        throw new GatewayError(`钱包当前网络(${walletClient.chain?.id})与目标网络(${chainId})不一致`);
    }
    const gateway = getGatewayAddress(chainId);
    if (!gateway) throw new GatewayError(`未配置 Gateway 地址: chainId=${chainId}`);
    const sender = walletClient.account?.address as Address;
    if (!sender) throw new GatewayError("钱包未连接");

    const data = encodePlanCalldata(plan);
    const hash = await walletClient.writeContract({
        abi: GATEWAY_ABI,
        address: gateway as Address,
        functionName: "depositAndCall",
        args: [universalApp, data, revertOptions],
        value: nativeAmountWei,
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    return { chainId, hash };
}

// 使用 ERC20 代币 + 调用
export async function depositPlanWithERC20(
    publicClient: PublicClient,
    walletClient: WalletClient,
    chainId: number,
    erc20Token: Address,
    universalApp: Address,
    amount: bigint,
    plan: ExecutablePlan,
    revertOptions: RevertOptions
): Promise<GatewayTxResult> {
    if (walletClient.chain?.id !== chainId) {
        throw new GatewayError(`钱包当前网络(${walletClient.chain?.id})与目标网络(${chainId})不一致`);
    }
    const gateway = getGatewayAddress(chainId);
    if (!gateway) throw new GatewayError(`未配置 Gateway 地址: chainId=${chainId}`);
    const sender = walletClient.account?.address as Address;
    if (!sender) throw new GatewayError("钱包未连接");

    // 先确保 allowance 充足
    await ensureAllowance(publicClient, walletClient, erc20Token, sender, gateway as Address, amount);

    const data = encodePlanCalldata(plan);
    const hash = await walletClient.writeContract({
        abi: GATEWAY_ABI,
        address: gateway as Address,
        functionName: "depositAndCall",
        args: [universalApp, amount, erc20Token, data, revertOptions],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    return { chainId, hash };
}

export async function depositCallWithNativeData(
    _publicClient: PublicClient,
    walletClient: WalletClient,
    chainId: number,
    universalApp: Address,
    nativeAmountWei: bigint,
    data: Hex,
    revertOptions: RevertOptions
): Promise<GatewayTxResult> {
    if (walletClient.chain?.id !== chainId) {
        throw new GatewayError(`钱包当前网络(${walletClient.chain?.id})与目标网络(${chainId})不一致`);
    }
    const gateway = getGatewayAddress(chainId);
    if (!gateway) throw new GatewayError(`未配置 Gateway 地址: chainId=${chainId}`);

    const hash = await walletClient.writeContract({
        abi: GATEWAY_ABI,
        address: gateway as Address,
        functionName: 'depositAndCall',
        args: [universalApp, data, revertOptions],
        value: nativeAmountWei,
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    return { chainId, hash };
}

export async function depositCallWithERC20Data(
    publicClient: PublicClient,
    walletClient: WalletClient,
    chainId: number,
    erc20Token: Address,
    universalApp: Address,
    amount: bigint,
    data: Hex,
    revertOptions: RevertOptions
): Promise<GatewayTxResult> {
    if (walletClient.chain?.id !== chainId) {
        throw new GatewayError(`钱包当前网络(${walletClient.chain?.id})与目标网络(${chainId})不一致`);
    }
    const gateway = getGatewayAddress(chainId);
    if (!gateway) throw new GatewayError(`未配置 Gateway 地址: chainId=${chainId}`);
    const sender = walletClient.account?.address as Address;
    if (!sender) throw new GatewayError('钱包未连接');

    await ensureAllowance(publicClient, walletClient, erc20Token, sender, gateway as Address, amount);

    const hash = await walletClient.writeContract({
        abi: GATEWAY_ABI,
        address: gateway as Address,
        functionName: 'depositAndCall',
        args: [universalApp, amount, erc20Token, data, revertOptions],
        account: walletClient.account!,
        chain: walletClient.chain,
    });
    return { chainId, hash };
}

// 等待回执
export async function waitForReceipt(
    publicClient: PublicClient,
    hash: Hex
) {
    return publicClient.waitForTransactionReceipt({ hash });
}
