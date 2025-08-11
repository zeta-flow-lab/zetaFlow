## 设计说明：ZetaFlow — AI 驱动的跨链资产配置器（黑客松版）

本文面向实现团队，落地“对话 → 计划 → 跨链执行 → 回滚/追踪”的最小可行架构。前端以现有 `ZetaFlow` UI 为基础扩展；链上以 ZetaChain 测试网的 Universal App 合约为核心；跨链通道通过 Gateway（连接链入站 / ZetaChain 出站）。

参考文档：[Gateway – ZetaChain 文档](https://www.zetachain.com/docs/developers/evm/gateway/)

---

### 一、系统架构
- 前端（React + TS + Vite）
  - 对话与意图解析：把“50/30/20 + 预算 + 约束 + 目标链偏好”解析为计划 JSON
  - 计划摘要与风控预检：人类可读摘要、费用估计、最大滑点、回滚策略
  - 执行器：
    - 连接链发起：ERC-20 `approve` → 连接链 Gateway 方法（存入 + 可选 `callData`）
    - 交易追踪：显示每步 tx/hash/状态/退款
  - 配置：RPC、链 ID、Gateway 地址、Universal App 地址、ZRC-20 映射

- 轻后端（可选，若时间不够可省略）
  - 价格/路由聚合缓存、计划求解（也可前端计算）
  - Webhook/队列：接收合约事件，推送状态给前端（可选）

- 链上（ZetaChain 测试网）
  - Universal App 合约：
    - 入站处理：接收来自连接链 Gateway 的调用与 `callData`（计划 JSON 的编码）
    - 计划执行：根据计划拆分为多笔操作，按顺序执行
    - 出站提现：通过 ZetaChain 侧 Gateway 将对应 ZRC-20 提现至目标链（原生或 ERC-20），必要时附带目标链合约调用
    - 事件与回滚：记录 `PlanAccepted`、`StepExecuted`、`StepFailed`、`Refunded` 等事件；遵循官方回滚/退款路径

---

### 二、数据与类型
核心计划 JSON（编码后随 `callData` 入站 ZetaChain）：
```json
{
  "intent": "rebalance",
  "targets": [
    { "symbol": "BTC", "weight": 0.5, "dstChain": "bitcoin" },
    { "symbol": "ETH", "weight": 0.3, "dstChain": "ethereum" },
    { "tag": "high_risk", "weight": 0.2, "basket": ["ARB", "OP", "SOL"] }
  ],
  "constraints": { "maxSlippageBps": 50, "maxTxCount": 6, "budget": { "symbol": "USDC", "amount": "2000" } },
  "settlement": { "mode": "withdraw_native_or_erc20", "holdOnZetaFallback": true }
}
```

前端 TypeScript 接口（建议）：
```ts
export interface AllocationTarget {
  symbol?: string;
  tag?: "high_risk" | "stable" | "layer2" | string;
  basket?: string[];
  weight: number; // 0~1
  dstChain?: string; // 例如 "ethereum" | "bitcoin"
}

export interface PlanConstraints {
  maxSlippageBps: number; // 例如 50 = 0.5%
  maxTxCount: number;
  budget?: { symbol: string; amount: string };
}

export interface PlanSpec {
  intent: "rebalance" | "dca" | string;
  targets: AllocationTarget[];
  constraints: PlanConstraints;
  settlement: { mode: "withdraw_native_or_erc20" | "hold_on_zeta"; holdOnZetaFallback?: boolean };
}
```

---

### 三、前端实现要点
1) 指令解析扩展（在 `src/pages/trade/trade.tsx` 内）：
   - 新增 `rebalance`（资产配置/再平衡）意图解析；解析百分比、预算、最大滑点、链偏好等
   - 即时预览 `PlanSpec`，在 UI 中展示 JSON 摘要

2) 计划摘要与执行模态：
   - 展示：目标权重、现有持仓差额、预计步骤/费用/时延、回滚策略
   - 执行：
     - 若支付资产为 ERC-20：`approve` → 调用连接链 Gateway（方法：存入 + `callData`）
     - 若为原生：直接走连接链 Gateway 原生存入变体
   - 交易跟踪：
     - 监听连接链 tx 确认、显示 hash / explorer 链接
     - 订阅或轮询 ZetaChain 合约事件，展示每个 Step 的完成/失败/退款

3) 配置与工具：
   - `src/config/chains.ts`：链 ID、RPC、explorer、符号
   - `src/config/addresses.ts`：Gateway 地址、Universal App 地址（测试网）
   - `src/lib/gateway.ts`：封装连接链与 ZetaChain 侧调用（ABI、编码、发送交易）
   - 钱包：`wagmi + viem` 或 `ethers v6`（黑客松推荐前者）

---

### 四、合约设计（ZetaChain 测试网）
最小版 `UniversalApp.sol`：
- 依赖：官方 Gateway 接口（地址与 ABI 以测试网为准）
- 方法：
  - `submitPlan(bytes plan)`: 由连接链 Gateway 入站调用；`plan` 为前端编码后的 `PlanSpec`
  - `executeNextStep()`: 内部/外部触发，按照顺序执行计划中的下一步
  - `withdrawToConnectedChain(...)`: 通过 ZetaChain 侧 Gateway 提现为原生或 ERC-20，必要时附带目标链合约调用
- 事件：`PlanAccepted(planId, sender)`, `StepExecuted(planId, stepId)`, `StepFailed(planId, stepId, reason)`, `Refunded(planId, amount, to)`
- 安全：访问控制（仅 Gateway 可调用 `submitPlan`）、参数边界检查、重入保护、紧急暂停

执行模型说明：
- 由于协议当前“一次仅单资产入/出金”，复杂计划需拆分多笔顺序执行（在合约或前端编排），每步完成记录事件，失败触发回滚。

---

### 五、失败回滚与状态机
- 失败来源：目标链合约调用失败、额度不足、价格偏移超限
- 回滚路径：
  - Gateway 支持的退款机制：退回到源链指定合约或直接退回 EOA（无需调用合约）
  - 合约内记录 `Refunded` 事件，前端据此提示用户
- 状态机：`Pending -> Executing -> PartialFailed/Retrying -> Completed/Refunded`

---

### 六、测试与演示
- 测试网：优先 EVM 测试网 + ZetaChain 测试网
- 用例：
  - 正常：USDC → 计划入站 → 分步提现到 Ethereum/Bitcoin（BTC 可用 WBTC 占位）
  - 失败：构造目标链调用失败，验证退款路径与 UI 提示
- 演示脚本：
  - 输入自然语言 → 计划摘要 → 执行 → 追踪事件 → 展示退款或完成

---

### 七、目录与任务
- 新增目录：
  - `src/config/`：`chains.ts`, `addresses.ts`
  - `src/lib/`：`gateway.ts`, `plan.ts`（生成/校验计划）
  - `contracts/`：`UniversalApp.sol`（Foundry 工程）
- 任务分工：
  - 前端 A：指令解析 + 摘要/执行模态 + 交易追踪
  - 前端 B：钱包/网络切换 + 地址/ABI 配置 + Explorer 链接
  - 合约：合约实现 + 部署脚本 + 事件设计 + 回滚用例

---

### 八、开放问题
- Gateway 具体地址/ABI 以官方测试网为准；需尽快确认并写入配置
- 高风险资产篮子可先用固定集合/白名单；正式版对接聚合器
- 价格与路由可临时用免费 API，并加本地缓存；正式版再替换成稳健来源

---

以上设计聚焦“AI 价值（规划+解释+风控）× ZetaChain 通用能力（跨链与回滚）”，保证黑客松周期内可交付与可演示。


