/**
 * 计划生成器 - 从意图生成可执行的跨链计划
 */

import type { RebalanceIntent } from './intent-parser';

export interface PlanStep {
    id: string;
    type: 'swap' | 'transfer' | 'withdraw';
    fromToken: string;
    toToken: string;
    amount: string;
    fromChain: string;
    toChain: string;
    estimatedFee: string;
    estimatedTime: number; // 分钟
    priority: number; // 执行优先级
}

export interface PlanSummary {
    totalSteps: number;
    totalEstimatedFee: string;
    totalEstimatedTime: number; // 分钟
    riskLevel: 'low' | 'medium' | 'high';
    successProbability: number; // 0-1
}

export interface ExecutablePlan {
    id: string;
    intent: RebalanceIntent;
    steps: PlanStep[];
    summary: PlanSummary;
    callData: string; // ABI编码后的数据
    createdAt: number;
    status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface UserBalance {
    token: string;
    chain: string;
    amount: string;
    usdValue: string;
}

/**
 * 模拟用户余额（实际应从链上查询）
 */
const mockUserBalances: UserBalance[] = [
    { token: 'USDC', chain: 'ethereum', amount: '2000', usdValue: '2000' },
    { token: 'ETH', chain: 'ethereum', amount: '0.5', usdValue: '1600' },
    { token: 'BTC', chain: 'bitcoin', amount: '0.01', usdValue: '1000' },
    { token: 'ZETA', chain: 'zetachain', amount: '100', usdValue: '80' }
];

/**
 * 模拟价格数据
 */
const mockPrices: Record<string, number> = {
    'BTC': 100000,
    'ETH': 3200,
    'USDC': 1,
    'USDT': 1,
    'ZETA': 0.8,
    'SOL': 200,
    'ARB': 0.8,
    'OP': 2.5,
    'MATIC': 0.9
};

/**
 * 生成执行计划
 */
export async function generatePlan(intent: RebalanceIntent): Promise<ExecutablePlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. 获取当前余额，并根据用户预算重置“支付资产”来源
    const currentBalances = await getCurrentBalances();
    // 如果用户显式给定预算（如 1 ETH），将该资产视为唯一可用来源，覆盖 mockBalances
    if (intent.budget && intent.budget.amount > 0) {
        const symbol = intent.budget.symbol.toUpperCase();
        const amount = intent.budget.amount;
        // 假设估值（简化）：ETH≈3200USD，BTC≈100000USD，USDC≈1USD
        const priceMap: Record<string, number> = { ETH: 3200, BTC: 100000, USDC: 1, USDT: 1 };
        const usdValue = (priceMap[symbol] || 1) * amount;
        // 重置来源为“用户给定预算”
        while (currentBalances.length) currentBalances.pop();
        currentBalances.push({
            token: symbol,
            chain: symbol === 'ETH' ? 'ethereum' : symbol === 'BTC' ? 'bitcoin' : 'ethereum',
            amount: String(amount),
            usdValue: String(usdValue)
        });
    }
    const totalUsdValue = calculateTotalValue(currentBalances);

    // 2. 计算目标分配
    const targetAllocations = calculateTargetAllocations(intent, totalUsdValue);

    // 3. 计算需要的交易
    const steps = generateSteps(currentBalances, targetAllocations);

    // 4. 生成摘要
    const summary = generateSummary(steps);

    // 5. 生成callData
    const callData = await generateCallData(intent, steps);

    return {
        id: planId,
        intent,
        steps,
        summary,
        callData,
        createdAt: Date.now(),
        status: 'pending'
    };
}

async function getCurrentBalances(): Promise<UserBalance[]> {
    // TODO: 实际从多链查询用户余额
    // 这里返回模拟数据
    return mockUserBalances;
}

function calculateTotalValue(balances: UserBalance[]): number {
    return balances.reduce((total, balance) => {
        return total + parseFloat(balance.usdValue);
    }, 0);
}

function calculateTargetAllocations(intent: RebalanceIntent, totalValue: number) {
    const budget = intent.budget ? intent.budget.amount : totalValue;

    return intent.targets.map(target => {
        const targetValue = budget * target.weight;

        if (target.symbol) {
            return {
                token: target.symbol,
                chain: target.dstChain || 'ethereum',
                targetUsdValue: targetValue,
                weight: target.weight
            };
        } else if (target.tag && target.basket) {
            // 对于篮子资产，平均分配
            const perTokenValue = targetValue / target.basket.length;
            return target.basket.map(token => ({
                token,
                chain: target.dstChain || 'ethereum',
                targetUsdValue: perTokenValue,
                weight: target.weight / target.basket.length
            }));
        }

        return [];
    }).flat();
}

function generateSteps(
    currentBalances: UserBalance[],
    targetAllocations: any[]
): PlanStep[] {
    const steps: PlanStep[] = [];
    let stepCounter = 0;

    // 简化算法：将来源资产先对齐为 USDC 再分配
    // 第一阶段：来源资产 → USDC（仅针对来源资产，不再遍历 mock 的其它资产）
    currentBalances.forEach(balance => {
        if (parseFloat(balance.amount) <= 0) return;
        if (balance.token === 'USDC') return;
        steps.push({
            id: `step_${++stepCounter}`,
            type: 'swap',
            fromToken: balance.token,
            toToken: 'USDC',
            amount: balance.amount,
            fromChain: balance.chain,
            toChain: 'ethereum',
            estimatedFee: calculateSwapFee(balance.token, 'USDC', balance.amount),
            estimatedTime: 5,
            priority: 1
        });
    });

    // 第二阶段：从USDC分配到目标资产
    targetAllocations.forEach(allocation => {
        if (allocation.token !== 'USDC') {
            const usdcAmount = allocation.targetUsdValue / mockPrices['USDC'];
            const targetAmount = allocation.targetUsdValue / (mockPrices[allocation.token] || 1);

            steps.push({
                id: `step_${++stepCounter}`,
                type: 'swap',
                fromToken: 'USDC',
                toToken: allocation.token,
                amount: usdcAmount.toString(),
                fromChain: 'ethereum',
                toChain: allocation.chain,
                estimatedFee: calculateSwapFee('USDC', allocation.token, usdcAmount.toString()),
                estimatedTime: allocation.chain === 'ethereum' ? 3 : 8,
                priority: 2
            });
        }
    });

    return steps;
}

function calculateSwapFee(fromToken: string, toToken: string, amount: string): string {
    // 简化的费用计算
    const baseGasFee = 0.01; // ETH
    const protocolFee = parseFloat(amount) * 0.003; // 0.3%
    return (baseGasFee + protocolFee).toFixed(4);
}

function generateSummary(steps: PlanStep[]): PlanSummary {
    const totalEstimatedFee = steps.reduce((total, step) =>
        total + parseFloat(step.estimatedFee), 0
    ).toFixed(4);

    const totalEstimatedTime = Math.max(...steps.map(step => step.estimatedTime));

    // 风险评估：基于步骤数量和跨链复杂度
    const crossChainSteps = steps.filter(step => step.fromChain !== step.toChain).length;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (crossChainSteps > 3 || steps.length > 5) {
        riskLevel = 'high';
    } else if (crossChainSteps > 1 || steps.length > 3) {
        riskLevel = 'medium';
    }

    const successProbability = Math.max(0.7, 1 - (steps.length * 0.05) - (crossChainSteps * 0.1));

    return {
        totalSteps: steps.length,
        totalEstimatedFee,
        totalEstimatedTime,
        riskLevel,
        successProbability
    };
}

async function generateCallData(intent: RebalanceIntent, steps: PlanStep[]): Promise<string> {
    // TODO: 实际ABI编码
    // 这里返回模拟的编码数据
    const planData = {
        intent: intent.type,
        targets: intent.targets,
        constraints: intent.constraints,
        steps: steps.map(step => ({
            type: step.type,
            fromToken: step.fromToken,
            toToken: step.toToken,
            amount: step.amount,
            fromChain: step.fromChain,
            toChain: step.toChain
        }))
    };

    // 简化：返回JSON的hex编码（浏览器环境无 Buffer，改用 TextEncoder ）
    const json = JSON.stringify(planData);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    let hex = '0x';
    for (let i = 0; i < bytes.length; i++) {
        const h = bytes[i].toString(16).padStart(2, '0');
        hex += h;
    }
    return hex;
}

/**
 * 计划验证
 */
export function validatePlan(plan: ExecutablePlan): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查权重总和
    const totalWeight = plan.intent.targets.reduce((sum, target) => sum + target.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
        errors.push(`权重总和应为100%，当前为${(totalWeight * 100).toFixed(1)}%`);
    }

    // 检查预算充足性
    if (plan.intent.budget) {
        const requiredBudget = plan.intent.budget.amount;
        const availableBudget = mockUserBalances
            .filter(b => b.token === plan.intent.budget!.symbol)
            .reduce((sum, b) => sum + parseFloat(b.amount), 0);

        if (availableBudget < requiredBudget) {
            errors.push(`预算不足：需要${requiredBudget} ${plan.intent.budget.symbol}，可用${availableBudget}`);
        }
    }

    // 检查步骤数量
    if (plan.steps.length > plan.intent.constraints.maxTxCount) {
        errors.push(`步骤数量超限：${plan.steps.length} > ${plan.intent.constraints.maxTxCount}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 格式化显示
 */
export function formatPlanSummary(plan: ExecutablePlan): string {
    const { summary, steps } = plan;

    return `
📊 计划摘要
• 总步骤：${summary.totalSteps}
• 预计费用：${summary.totalEstimatedFee} ETH
• 预计时间：${summary.totalEstimatedTime} 分钟
• 风险等级：${summary.riskLevel === 'low' ? '低' : summary.riskLevel === 'medium' ? '中' : '高'}
• 成功概率：${(summary.successProbability * 100).toFixed(1)}%

📝 执行步骤
${steps.map((step, i) =>
        `${i + 1}. ${step.fromToken} → ${step.toToken} (${step.fromChain} → ${step.toChain})`
    ).join('\n')}
  `.trim();
}


