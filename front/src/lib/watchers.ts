/**
 * 链上事件监听工具（基于 viem）
 */

import type { Address, PublicClient } from "viem";
import { parseAbi } from "viem";
import { getGatewayAddress, GATEWAY_ABI_FRAGMENTS } from "../config/addresses";

const GATEWAY_ABI = parseAbi(GATEWAY_ABI_FRAGMENTS as readonly string[]);

// Universal App 合约事件（与合约保持一致）
const UNIVERSAL_APP_ABI = parseAbi([
    'event PlanSubmitted(bytes32 indexed planId, address indexed submitter, bytes32 planDataHash)',
    'event StepExecuted(bytes32 indexed planId, uint256 indexed stepIndex, address token, uint256 amount, uint256 dstChainId, address receiver)',
    'event PlanCompleted(bytes32 indexed planId, uint256 steps)',
    'event PlanFailed(bytes32 indexed planId, string reason)',
    'event PlanReverted(address asset, uint64 amount, bytes revertMessage)'
] as const);

export interface GatewayDepositEvent {
    args: {
        sender?: Address;
        receiver?: Address;
        amount?: bigint;
        data?: `0x${string}`;
    };
    log: any;
}

export interface GatewayWithdrawEvent {
    args: {
        token?: Address;
        receiver?: Address;
        amount?: bigint;
        chainId?: bigint;
    };
    log: any;
}

export function watchGatewayDeposits(
    publicClient: PublicClient,
    chainId: number,
    onEvent: (ev: GatewayDepositEvent) => void
): () => void {
    const gateway = getGatewayAddress(chainId);
    if (!gateway) return () => { };
    const unwatch = publicClient.watchContractEvent({
        address: gateway as Address,
        abi: GATEWAY_ABI,
        eventName: "Deposited",
        onLogs: (logs) => {
            for (const log of logs) {
                onEvent({ args: (log as any).args, log });
            }
        },
    });
    return () => unwatch?.();
}

export function watchGatewayWithdrawals(
    publicClient: PublicClient,
    chainId: number,
    onEvent: (ev: GatewayWithdrawEvent) => void
): () => void {
    const gateway = getGatewayAddress(chainId);
    if (!gateway) return () => { };
    const unwatch = publicClient.watchContractEvent({
        address: gateway as Address,
        abi: GATEWAY_ABI,
        eventName: "Withdrawn",
        onLogs: (logs) => {
            for (const log of logs) {
                onEvent({ args: (log as any).args, log });
            }
        },
    });
    return () => unwatch?.();
}

export function watchUniversalApp(
    publicClient: PublicClient,
    appAddress: Address,
    handlers: Partial<{
        onPlanSubmitted: (log: any) => void,
        onStepExecuted: (log: any) => void,
        onPlanCompleted: (log: any) => void,
        onPlanFailed: (log: any) => void,
        onPlanReverted: (log: any) => void,
    }>
): () => void {
    const unsubs: Array<() => void> = [];
    if (!publicClient || !appAddress) return () => { };

    if (handlers.onPlanSubmitted) {
        const un = publicClient.watchContractEvent({
            address: appAddress,
            abi: UNIVERSAL_APP_ABI,
            eventName: 'PlanSubmitted',
            onLogs: (logs) => logs.forEach((log) => handlers.onPlanSubmitted?.(log))
        });
        unsubs.push(() => un?.());
    }
    if (handlers.onStepExecuted) {
        const un = publicClient.watchContractEvent({
            address: appAddress,
            abi: UNIVERSAL_APP_ABI,
            eventName: 'StepExecuted',
            onLogs: (logs) => logs.forEach((log) => handlers.onStepExecuted?.(log))
        });
        unsubs.push(() => un?.());
    }
    if (handlers.onPlanCompleted) {
        const un = publicClient.watchContractEvent({
            address: appAddress,
            abi: UNIVERSAL_APP_ABI,
            eventName: 'PlanCompleted',
            onLogs: (logs) => logs.forEach((log) => handlers.onPlanCompleted?.(log))
        });
        unsubs.push(() => un?.());
    }
    if (handlers.onPlanFailed) {
        const un = publicClient.watchContractEvent({
            address: appAddress,
            abi: UNIVERSAL_APP_ABI,
            eventName: 'PlanFailed',
            onLogs: (logs) => logs.forEach((log) => handlers.onPlanFailed?.(log))
        });
        unsubs.push(() => un?.());
    }
    if (handlers.onPlanReverted) {
        const un = publicClient.watchContractEvent({
            address: appAddress,
            abi: UNIVERSAL_APP_ABI,
            eventName: 'PlanReverted',
            onLogs: (logs) => logs.forEach((log) => handlers.onPlanReverted?.(log))
        });
        unsubs.push(() => un?.());
    }

    return () => { unsubs.forEach((u) => u()); };
}

