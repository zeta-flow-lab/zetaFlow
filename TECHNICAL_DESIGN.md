# ZetaFlow 技术设计文档

## 项目概述

ZetaFlow 是一个基于 ZetaChain 的 AI 驱动跨链资产配置器，旨在通过自然语言交互简化复杂的多链资产重平衡操作。项目充分利用 ZetaChain 的 Universal App 架构和 Gateway 机制，实现"一次部署，多链执行"的资产管理体验。

**核心价值**：AI 理解与规划 + ZetaChain 跨链执行 + Gateway 回滚保障

---

## 系统架构

### 整体架构图

```
用户自然语言 → AI意图解析 → 计划生成 → 前端确认 → Gateway调用 → Universal App → 跨链执行
      ↓              ↓          ↓         ↓         ↓            ↓           ↓
  "50% BTC"    RebalanceIntent  ExecutablePlan  用户签名   depositAndCall  合约执行    多链提现
```

### 三层架构设计

#### 1. 前端交互层 (React + TypeScript)
- **意图解析器**: 自然语言 → 结构化意图
- **计划生成器**: 意图 → 可执行交易计划
- **用户界面**: 对话交互 + 计划确认 + 执行追踪

#### 2. 协议集成层 (ZetaChain Gateway)
- **连接链 Gateway**: 资产存入 + 合约调用
- **ZetaChain Gateway**: 多步提现 + 目标链交互
- **回滚机制**: 失败自动退款到源链

#### 3. 合约执行层 (Universal App)
- **计划接收**: 解析入站 callData
- **步骤执行**: 顺序执行交易计划
- **状态管理**: 记录执行进度和结果

---

## 核心模块设计

### 1. AI 意图解析系统

#### 文件位置
```
front/src/lib/intent-parser.ts
```

#### 核心接口
```typescript
export interface RebalanceIntent {
  type: "rebalance";
  targets: AllocationTarget[];
  budget?: { symbol: string; amount: number };
  constraints: PlanConstraints;
  preferences: ChainPreferences;
}

export interface AllocationTarget {
  symbol?: string;           // 具体代币 (BTC, ETH)
  tag?: string;             // 资产类别 (high_risk, stable, layer2)
  basket?: string[];        // 篮子资产 (ARB, OP, SOL)
  weight: number;           // 权重 0-1
  dstChain?: string;        // 目标链偏好
}
```

#### 解析能力
- ✅ 百分比权重提取：`"50% BTC, 30% ETH"`
- ✅ 预算识别：`"2000 USDC 预算"`
- ✅ 约束解析：`"最大滑点 0.5%"`
- ✅ 链偏好：`"优先 Ethereum/Bitcoin"`
- ✅ 资产篮子：`"20% 风险资产"` → `["ARB", "OP", "SOL"]`

#### 扩展计划
- 🔄 时间约束：`"30分钟内完成"`
- 🔄 频率设置：`"每月定投 500 USDC"`
- 🔄 风险等级：`"保守型配置"`

### 2. 智能计划生成器

#### 文件位置
```
front/src/lib/plan-generator.ts
```

#### 核心算法
```typescript
export async function generatePlan(intent: RebalanceIntent): Promise<ExecutablePlan> {
  // 1. 查询当前多链余额
  const balances = await getCurrentBalances();
  
  // 2. 计算目标分配与差额
  const targetAllocations = calculateTargetAllocations(intent, totalValue);
  
  // 3. 生成最优交易路径 (最小换手)
  const steps = generateOptimalSteps(balances, targetAllocations);
  
  // 4. 费用估算与风险评估
  const summary = generateSummary(steps);
  
  // 5. 生成 Gateway callData
  const callData = await generateCallData(intent, steps);
  
  return { id, intent, steps, summary, callData, status: 'pending' };
}
```

#### 优化策略
- **最小换手算法**: 减少交易数量，降低费用
- **路径优化**: USDC 作为中间资产，减少直接交易对
- **批次执行**: 考虑 Gateway 单资产限制，自动拆分
- **失败回退**: 部分成交策略，避免全盘失败

#### 风险评估模型
```typescript
interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  successProbability: number;  // 基于历史数据和复杂度
  estimatedTime: number;       // 考虑链确认时间
  maxSlippage: number;         // 动态滑点计算
}
```

### 3. ZetaChain Gateway 集成

#### 连接链集成 (EVM)

##### 合约地址配置
```typescript
// front/src/config/addresses.ts
export const GATEWAY_ADDRESSES = {
  ethereum: {
    mainnet: "0x...",  // GatewayEVM 主网地址
    testnet: "0x..."   // Sepolia 测试网地址
  },
  bsc: {
    mainnet: "0x...",
    testnet: "0x..."
  },
  zetachain: {
    mainnet: "0x...",  // GatewayZEVM 主网地址
    testnet: "0x..."   // Athens 测试网地址
  }
};
```

##### Gateway 调用封装
```typescript
// front/src/lib/gateway.ts
export async function depositAndCallPlan(
  plan: ExecutablePlan,
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> {
  const gateway = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);
  
  // 编码计划数据
  const encodedPlan = ethers.utils.defaultAbiCoder.encode(
    ["string"], [JSON.stringify(plan)]
  );
  
  // 调用 Gateway
  if (isNativeToken(plan.intent.budget?.symbol)) {
    return await gateway.depositAndCall(
      universalAppAddress,
      encodedPlan,
      { value: plan.intent.budget?.amount }
    );
  } else {
    // ERC-20 需要先 approve
    await approveToken(tokenAddress, gatewayAddress, amount);
    return await gateway.depositAndCallERC20(
      tokenAddress,
      universalAppAddress,
      plan.intent.budget?.amount,
      encodedPlan
    );
  }
}
```

#### ZetaChain 侧集成

##### Universal App 合约接口
```solidity
// contracts/ZetaFlowUniversalApp.sol
pragma solidity ^0.8.0;

import "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";

contract ZetaFlowUniversalApp {
    IGatewayZEVM public immutable gateway;
    
    struct ExecutionPlan {
        string intent;
        PlanStep[] steps;
        uint256 totalBudget;
        address executor;
    }
    
    struct PlanStep {
        address fromToken;    // ZRC-20 地址
        address toToken;      // ZRC-20 地址
        uint256 amount;
        uint256 targetChain;  // 目标链 ID
        address recipient;    // 目标链接收地址
    }
    
    mapping(bytes32 => ExecutionPlan) public plans;
    mapping(bytes32 => uint256) public planProgress;
    
    event PlanReceived(bytes32 indexed planId, address executor);
    event StepExecuted(bytes32 indexed planId, uint256 stepIndex);
    event PlanCompleted(bytes32 indexed planId);
    event PlanFailed(bytes32 indexed planId, string reason);
    
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external {
        // 解析计划数据
        string memory planData = abi.decode(message, (string));
        ExecutionPlan memory plan = parsePlan(planData);
        
        // 存储计划
        bytes32 planId = keccak256(abi.encode(block.timestamp, msg.sender));
        plans[planId] = plan;
        
        emit PlanReceived(planId, context.sender);
        
        // 开始执行
        _executePlan(planId);
    }
    
    function _executePlan(bytes32 planId) internal {
        ExecutionPlan storage plan = plans[planId];
        
        for (uint256 i = 0; i < plan.steps.length; i++) {
            try this._executeStep(planId, i) {
                emit StepExecuted(planId, i);
                planProgress[planId] = i + 1;
            } catch {
                emit PlanFailed(planId, "Step execution failed");
                return;
            }
        }
        
        emit PlanCompleted(planId);
    }
    
    function _executeStep(bytes32 planId, uint256 stepIndex) external {
        PlanStep memory step = plans[planId].steps[stepIndex];
        
        // 调用 ZetaChain Gateway 执行提现
        gateway.withdraw(
            step.toToken,
            step.amount,
            step.targetChain,
            step.recipient,
            new bytes(0) // 简单提现，无额外调用
        );
    }
}
```

### 4. 前端用户界面

#### 对话交互系统
```typescript
// front/src/pages/trade/components/Chat.tsx
export default function Chat({ onRebalance, onShowToast }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  
  async function handleSend() {
    const action = parseCommand(input);
    
    if (action.type === "rebalance" && action.intent) {
      // 生成计划
      const plan = await generatePlan(action.intent);
      const validation = validatePlan(plan);
      
      if (validation.isValid) {
        const summary = formatPlanSummary(plan);
        setMessages(m => [...m, { role: "assistant", text: summary }]);
        onRebalance(plan);  // 触发模态显示
      } else {
        setMessages(m => [...m, { 
          role: "assistant", 
          text: `计划验证失败：${validation.errors.join(', ')}` 
        }]);
      }
    }
  }
}
```

#### 计划确认模态
```typescript
// 位于 front/src/pages/trade/trade.tsx
function RebalancePlanModal({ plan, onExecute, onClose }) {
  return (
    <div className="space-y-4">
      {/* 配置目标展示 */}
      <ConfigurationTargets targets={plan.intent.targets} />
      
      {/* 执行步骤列表 */}
      <ExecutionSteps steps={plan.steps} />
      
      {/* 费用和风险摘要 */}
      <CostAndRiskSummary summary={plan.summary} />
      
      {/* 验证结果 */}
      <ValidationResults validation={validatePlan(plan)} />
      
      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <button onClick={onClose}>取消</button>
        <button 
          onClick={() => handleExecute(plan)}
          disabled={!validatePlan(plan).isValid}
        >
          执行计划
        </button>
      </div>
    </div>
  );
}
```

---

## 数据流设计

### 1. 完整数据流
```
[用户输入] → [意图解析] → [计划生成] → [用户确认] → [Gateway调用] → [合约执行] → [结果追踪]
    ↓            ↓            ↓            ↓            ↓            ↓            ↓
自然语言    RebalanceIntent  ExecutablePlan   签名确认    链上交易    步骤执行    状态更新
```

### 2. 状态管理
```typescript
interface AppState {
  // 当前会话
  currentPlan: ExecutablePlan | null;
  planStatus: 'draft' | 'pending' | 'executing' | 'completed' | 'failed';
  
  // 用户数据
  connectedAccount: string | null;
  multiChainBalances: BalanceMap;
  
  // 交易追踪
  activeTxs: TransactionTracker[];
  executionHistory: PlanExecution[];
}
```

### 3. 事件系统
```typescript
// 监听链上事件
interface EventListeners {
  onPlanReceived: (planId: string) => void;
  onStepExecuted: (planId: string, stepIndex: number) => void;
  onPlanCompleted: (planId: string) => void;
  onPlanFailed: (planId: string, reason: string) => void;
  onRefundIssued: (amount: string, recipient: string) => void;
}
```

---

## 技术实现要点

### 1. 钱包集成 (优先级：高)

#### 推荐技术栈
```typescript
// 使用 wagmi + viem 作为主要钱包集成方案
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { createPublicClient, createWalletClient } from 'viem';

// 支持的钱包
const connectors = [
  injected(), // MetaMask
  walletConnect({ projectId }),
  coinbaseWallet({ appName: 'ZetaFlow' })
];
```

#### 网络配置
```typescript
// front/src/config/chains.ts
export const SUPPORTED_CHAINS = [
  {
    id: 1,
    name: 'Ethereum',
    network: 'ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://eth.llamarpc.com'] } },
    gatewayAddress: '0x...'
  },
  {
    id: 7001,
    name: 'ZetaChain Athens',
    network: 'zetachain-testnet',
    nativeCurrency: { name: 'Zeta', symbol: 'ZETA', decimals: 18 },
    rpcUrls: { default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] } },
    gatewayAddress: '0x...'
  }
];
```

### 2. 合约开发 (优先级：高)

#### 开发环境
```bash
# 推荐使用 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundry install

# 项目结构
contracts/
├── src/
│   ├── ZetaFlowUniversalApp.sol
│   ├── interfaces/
│   └── libraries/
├── test/
├── script/
└── foundry.toml
```

#### 部署脚本
```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/ZetaFlowUniversalApp.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        address gatewayZEVM = vm.envAddress("GATEWAY_ZEVM");
        ZetaFlowUniversalApp app = new ZetaFlowUniversalApp(gatewayZEVM);
        
        console.log("ZetaFlowUniversalApp deployed at:", address(app));
        
        vm.stopBroadcast();
    }
}
```

### 3. 错误处理与回滚

#### 前端错误处理
```typescript
export async function executeRebalancePlan(plan: ExecutablePlan) {
  try {
    // 1. 预检验证
    const validation = await preValidatePlan(plan);
    if (!validation.isValid) {
      throw new Error(`预检失败: ${validation.errors.join(', ')}`);
    }
    
    // 2. 执行交易
    const tx = await depositAndCallPlan(plan, signer);
    
    // 3. 监听执行状态
    const receipt = await tx.wait();
    await trackPlanExecution(plan.id, receipt.transactionHash);
    
  } catch (error) {
    // 分类错误处理
    if (error.code === 'INSUFFICIENT_FUNDS') {
      showError('余额不足，请检查账户资金');
    } else if (error.code === 'USER_REJECTED') {
      showError('用户取消了交易');
    } else {
      showError(`执行失败: ${error.message}`);
    }
  }
}
```

#### 合约回滚处理
```solidity
contract ZetaFlowUniversalApp {
    modifier onlyValidPlan(string memory planData) {
        require(validatePlanData(planData), "Invalid plan data");
        _;
    }
    
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external onlyValidPlan(abi.decode(message, (string))) {
        try this._executePlanSafely(context, zrc20, amount, message) {
            // 成功执行
        } catch Error(string memory reason) {
            // 触发回滚，退还资金到源链
            _initiateRefund(context.sender, zrc20, amount, reason);
        }
    }
    
    function _initiateRefund(
        address originalSender,
        address token,
        uint256 amount,
        string memory reason
    ) internal {
        // 调用 Gateway 退还到源链
        gateway.withdraw(
            token,
            amount,
            context.chainID, // 退还到原链
            originalSender,
            abi.encode("REFUND", reason)
        );
        
        emit RefundInitiated(originalSender, token, amount, reason);
    }
}
```

---

## 测试策略

### 1. 单元测试
```typescript
// 意图解析测试
describe('Intent Parser', () => {
  test('解析基础资产配置', () => {
    const input = "把我2000 USDC配置为50% BTC，30% ETH，20%风险资产";
    const result = parseIntent(input);
    
    expect(result.type).toBe('rebalance');
    expect(result.targets).toHaveLength(3);
    expect(result.budget?.amount).toBe(2000);
  });
});

// 计划生成测试
describe('Plan Generator', () => {
  test('生成最优交易路径', async () => {
    const intent = mockRebalanceIntent();
    const plan = await generatePlan(intent);
    
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.summary.totalEstimatedFee).toBeDefined();
  });
});
```

### 2. 集成测试
```typescript
// Gateway 调用测试
describe('Gateway Integration', () => {
  test('成功执行资产配置计划', async () => {
    const plan = mockExecutablePlan();
    const tx = await depositAndCallPlan(plan, mockSigner);
    
    expect(tx.hash).toBeDefined();
    // 等待链上确认...
  });
});
```

### 3. 端到端测试
```typescript
// 完整流程测试
describe('End-to-End Flow', () => {
  test('从意图到执行的完整流程', async () => {
    // 1. 解析意图
    const intent = parseIntent("配置50% BTC，50% ETH");
    
    // 2. 生成计划
    const plan = await generatePlan(intent);
    
    // 3. 验证计划
    const validation = validatePlan(plan);
    expect(validation.isValid).toBe(true);
    
    // 4. 执行计划 (测试网)
    const result = await executeRebalancePlan(plan);
    expect(result.success).toBe(true);
  });
});
```

---

## 部署指南

### 1. 环境准备
```bash
# 1. 克隆项目
git clone <repo-url>
cd zetaFlow

# 2. 安装依赖
cd front && npm install
cd ../contracts && forge install

# 3. 环境配置
cp .env.example .env
# 配置必要的环境变量
```

### 2. 测试网部署
```bash
# 1. 部署合约到 ZetaChain Athens 测试网
cd contracts
forge script script/Deploy.s.sol --rpc-url $ZETACHAIN_TESTNET_RPC --broadcast

# 2. 更新前端配置
# 将合约地址更新到 front/src/config/addresses.ts

# 3. 启动前端
cd front
npm run dev
```

### 3. 生产部署
```bash
# 1. 构建生产版本
cd front
npm run build

# 2. 部署到主网 (需要充分测试)
cd contracts
forge script script/Deploy.s.sol --rpc-url $ZETACHAIN_MAINNET_RPC --broadcast --verify
```

---

## 监控与运维

### 1. 事件监听
```typescript
// 监听合约事件
export function setupEventListeners() {
  const contract = new ethers.Contract(contractAddress, ABI, provider);
  
  contract.on('PlanReceived', (planId, executor, event) => {
    console.log(`Plan ${planId} received from ${executor}`);
    updateUI({ type: 'PLAN_RECEIVED', planId, executor });
  });
  
  contract.on('StepExecuted', (planId, stepIndex, event) => {
    console.log(`Step ${stepIndex} of plan ${planId} executed`);
    updateExecutionProgress(planId, stepIndex);
  });
}
```

### 2. 错误监控
```typescript
// 集成错误监控服务
import * as Sentry from '@sentry/react';

export function reportError(error: Error, context: any) {
  Sentry.captureException(error, {
    tags: { component: 'ZetaFlow' },
    extra: context
  });
}
```

### 3. 性能监控
```typescript
// 监控关键指标
export const metrics = {
  planGenerationTime: new Histogram('plan_generation_duration_ms'),
  transactionSuccess: new Counter('transactions_total'),
  userSatisfaction: new Gauge('user_satisfaction_score')
};
```

---

## 后续优化方向

### 短期优化 (1-2周)
1. **增强意图解析**: 支持更复杂的时间约束和频率设置
2. **优化路径算法**: 考虑实时流动性和滑点
3. **增强用户体验**: 更详细的执行进度追踪

### 中期优化 (1-2月)
1. **支持更多链**: 集成 Solana、Bitcoin 的资产配置
2. **高级策略**: DCA、网格交易、止盈止损
3. **社交功能**: 分享配置策略、跟单功能

### 长期愿景 (3-6月)
1. **AI 增强**: 基于历史数据的智能推荐
2. **DAO 治理**: 社区驱动的策略优化
3. **机构服务**: 大资金的专业化配置服务

---

## 文档维护

本文档应与代码同步更新，建议：
1. 新功能开发前先更新设计文档
2. 重要决策变更及时同步到文档
3. 定期回顾文档的准确性和完整性

**最后更新**: 2025-01-19  
**版本**: v1.0  
**维护人**: ZetaFlow 开发团队


