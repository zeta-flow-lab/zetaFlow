/**
 * 意图解析器 - 从自然语言解析资产配置意图
 */

export interface RebalanceIntent {
    type: "rebalance";
    targets: Array<{
        symbol?: string;
        tag?: "high_risk" | "stable" | "layer2";
        basket?: string[];
        weight: number; // 0-1
        dstChain?: string;
    }>;
    budget?: {
        symbol: string;
        amount: number;
    };
    constraints: {
        maxSlippageBps: number; // 默认50 (0.5%)
        maxTxCount: number; // 默认6
    };
    preferences: {
        targetChains?: string[];
        avoidChains?: string[];
    };
}

export interface SwapIntent {
    type: "swap";
    from: string;
    to: string;
    amount?: number;
    srcChain?: string;
    dstChain?: string;
}

export interface BalanceIntent {
    type: "balance";
    token?: string;
    chain?: string;
}

export type ParsedIntent = RebalanceIntent | SwapIntent | BalanceIntent | { type: "unknown" };

/**
 * 扩展的意图解析器
 */
export function parseIntent(input: string): ParsedIntent {
    // 规范化：去除中文量词“个”、多空格，统一小写
    const normalizedInput = input
        .trim()
        .toLowerCase()
        .replace(/个/g, ' ')
        .replace(/\s+/g, ' ');

    // 资产配置/重平衡意图
    if (isRebalanceIntent(normalizedInput)) {
        return parseRebalanceIntent(normalizedInput);
    }

    // 原有的swap意图
    if (/swap|兑换|兌換|换/.test(normalizedInput)) {
        return parseSwapIntent(normalizedInput);
    }

    // 原有的余额查询
    if (/余额|balance/.test(normalizedInput)) {
        return parseBalanceIntent(normalizedInput);
    }

    return { type: "unknown" };
}

function isRebalanceIntent(input: string): boolean {
    const rebalanceKeywords = [
        '配置', '重平衡', '平衡', 'rebalance', 'allocate', 'allocation',
        '分配', '组合', 'portfolio', '资产配置', '投资组合'
    ];

    const percentagePattern = /\d+%|\d+\s*percent/;

    return rebalanceKeywords.some(keyword => input.includes(keyword)) &&
        percentagePattern.test(input);
}

function parseRebalanceIntent(input: string): RebalanceIntent {
    // 清理中文量词与多余空格
    input = input.replace(/个/g, ' ').replace(/\s+/g, ' ');
    const targets: RebalanceIntent['targets'] = [];

    // 解析百分比配置
    // 匹配模式：50% BTC, 30% ETH, 20% 风险资产
    const percentageMatches = input.matchAll(/(\d+)%?\s*(btc|eth|usdc|usdt|bnb|sol|ada|dot|风险|高风险|稳定|layer2|l2)/gi);

    for (const match of percentageMatches) {
        const weight = parseInt(match[1]) / 100;
        const asset = match[2].toLowerCase();

        if (['风险', '高风险'].includes(asset)) {
            targets.push({
                tag: "high_risk",
                basket: ["ARB", "OP", "SOL", "MATIC"],
                weight,
                dstChain: "ethereum" // 默认
            });
        } else if (asset === '稳定') {
            targets.push({
                tag: "stable",
                basket: ["USDC", "USDT", "DAI"],
                weight,
                dstChain: "ethereum"
            });
        } else if (['layer2', 'l2'].includes(asset)) {
            targets.push({
                tag: "layer2",
                basket: ["ARB", "OP", "MATIC"],
                weight,
                dstChain: "ethereum"
            });
        } else {
            // 具体代币
            const symbol = asset.toUpperCase();
            const dstChain = getPreferredChain(symbol);
            targets.push({
                symbol,
                weight,
                dstChain
            });
        }
    }

    // 解析预算（支持 USDC/USDT/USD 以及 ETH/BTC 等）
    let budget: RebalanceIntent['budget'] | undefined;
    const budgetUsdMatch = input.match(/(\d+(?:\.\d+)?)\s*(usdc|usdt|usd)/i);
    if (budgetUsdMatch) {
        budget = { symbol: budgetUsdMatch[2].toUpperCase(), amount: parseFloat(budgetUsdMatch[1]) };
    } else {
        const budgetEthMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:个)?\s*(?:sepolia\s*)?eth/i);
        const budgetBtcMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:个)?\s*btc/i);
        if (budgetEthMatch) {
            budget = { symbol: 'ETH', amount: parseFloat(budgetEthMatch[1]) };
        } else if (budgetBtcMatch) {
            budget = { symbol: 'BTC', amount: parseFloat(budgetBtcMatch[1]) };
        }
    }

    // 解析约束条件
    const slippageMatch = input.match(/滑点\s*(\d+(?:\.\d+)?)%?|slippage\s*(\d+(?:\.\d+)?)%?/i);
    const maxSlippageBps = slippageMatch ?
        Math.round((parseFloat(slippageMatch[1] || slippageMatch[2]) * 100)) : 50;

    // 解析目标链偏好
    const chainMatches = input.matchAll(/(ethereum|bitcoin|solana|polygon|arbitrum|optimism|base)/gi);
    const targetChains = Array.from(chainMatches, m => m[1].toLowerCase());

    return {
        type: "rebalance",
        targets,
        budget,
        constraints: {
            maxSlippageBps,
            // 默认允许更多步骤，避免多目标/篮子展开导致容易超限
            maxTxCount: 12
        },
        preferences: {
            targetChains: targetChains.length > 0 ? targetChains : undefined
        }
    };
}

function parseSwapIntent(input: string): SwapIntent {
    const amt = Number(input.match(/(\d+\.?\d*)\s*(zeta|eth|btc|usdc)/)?.[1]);
    const from = (input.match(/\d+\.?\d*\s*(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const to = (input.match(/to\s*(zeta|eth|btc|usdc)/)?.[1] || input.match(/成\s*(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const srcChain = input.match(/(在|on)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    const dstChain = input.match(/(到|to)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];

    if (from && to) {
        return {
            type: "swap",
            from,
            to,
            amount: isNaN(amt) ? undefined : amt,
            srcChain,
            dstChain
        };
    }

    return { type: "unknown" };
}

function parseBalanceIntent(input: string): BalanceIntent {
    const token = (input.match(/(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const chain = input.match(/(在|on)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    return { type: "balance", token, chain };
}

function getPreferredChain(symbol: string): string {
    const chainMap: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDC': 'ethereum',
        'USDT': 'ethereum',
        'SOL': 'solana',
        'BNB': 'bsc',
        'MATIC': 'polygon',
        'ZETA': 'zetachain'
    };

    return chainMap[symbol] || 'ethereum';
}

/**
 * 意图解析示例测试
 */
export function testIntentParser() {
    const testCases = [
        "把我2000 USDC配置为50% BTC，30% ETH，20%风险资产，最大滑点0.5%",
        "重平衡到70% ETH, 30% 稳定币，预算1000 USDC",
        "配置 40% BTC 在 Bitcoin，40% ETH 在 Ethereum，20% Layer2",
        "将我的资产平衡为60% BTC、40% ETH"
    ];

    testCases.forEach(testCase => {
        console.log(`输入: ${testCase}`);
        console.log(`解析结果:`, parseIntent(testCase));
        console.log('---');
    });
}


