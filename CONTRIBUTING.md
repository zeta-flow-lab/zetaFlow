## 协作说明（ZetaFlow）

### 1. 环境依赖
- Node.js >= 20（推荐）
- pnpm 或 npm（本项目使用 npm 脚本）
- Foundry（合约编译/部署）：安装参考 `https://book.getfoundry.sh/getting-started/installation`

### 2. 必需/可选环境变量

前端（`front/.env`）
- 可选 `VITE_WALLET_CONNECT_PROJECT_ID`：启用 WalletConnect（无则自动禁用该 connector）
- 可选 `VITE_APP_URL`：DApp 对外 URL，用于钱包元数据（默认取 `window.location.origin`）
- 可选 `VITE_API_KEY`：OneRouter/AI 对话服务的 API Key（不配置可用 Command Mode 进行演示）
- 可选 `VITE_GATEWAY_7001`、`VITE_UNIVERSAL_APP_7001`：覆盖 ZetaChain Athens 的 Gateway 与已部署 Universal App 地址（若未配置则使用 `front/src/config/addresses.ts` 内置地址）

合约/脚本（在 shell 环境中）
- 必需 `PRIVATE_KEY`：用于 Foundry 部署/脚本执行的钱包私钥（测试网账户）
- 推荐 `GATEWAY_ZEVM`：ZetaChain Athens Gateway 地址（也可在脚本内指定）

注：前端链路与地址在 `front/src/config/chains.ts`、`front/src/config/addresses.ts` 中配置，已预置 Athens / Sepolia 等测试网公共 RPC 和官方 Gateway 地址。

### 3. 快速启动
```
cd zetaFlow/front
npm i
npm run dev
```
浏览器打开：
- 主应用（聊天/计划执行）：`http://localhost:5173/`
- 手动出站测试页：`http://localhost:5173/#/test`

前端 .env 示例（请复制到 `front/.env` 并按需修改）：

```ini
VITE_UNIVERSAL_APP_7001=0x671efc071f0405308e21B99092df945975ed534b
VITE_GATEWAY_7001=0x6c533f7fe93fae114d0954697069df33c9b74fd7

VITE_WALLET_CONNECT_PROJECT_ID=
VITE_APP_URL=http://localhost:5173
VITE_API_KEY=
```

重要：合约脚本（Foundry）需要在 shell 中配置私钥：
```bash
export PRIVATE_KEY=你的测试网私钥
```

### 4. 合约操作（测试网）
1) 编译
```
cd zetaFlow/contracts
forge build
```
2) 部署 Universal App（Athens）
```
export PRIVATE_KEY=你的测试私钥
forge script script/Deploy.s.sol:Deploy --rpc-url https://zetachain-athens-evm.blockpi.network/v1/rpc/public --private-key $PRIVATE_KEY --broadcast
```
3) 设置 Gateway 地址（若部署时未配置）
```
export GATEWAY_ZEVM=0x6c533f7fe93fae114d0954697069df33c9b74fd7
forge script script/SetGateway.s.sol:SetGateway --rpc-url https://zetachain-athens-evm.blockpi.network/v1/rpc/public --private-key $PRIVATE_KEY --broadcast --sig "run(address)" $GATEWAY_ZEVM
```
4) 可选：开启自动回流测试
```
cast send <UniversalApp地址> "setAutoWithdrawOnCall(bool)" true --rpc-url https://zetachain-athens-evm.blockpi.network/v1/rpc/public --private-key $PRIVATE_KEY
```

### 5. 测试流程建议
- 入站（连接链 → ZetaChain）：在主应用页面生成计划并执行（使用 Sepolia 进行 `depositAndCall`）。
- 手动出站（ZetaChain → 连接链）：打开测试页 `#/test`，填入 `PlanSubmitted` 事件中的 `planId`、选择正确的 ZRC-20（例如 sETH/sUSDC）、金额与接收 EVM 地址，点击执行。
  - 若你有新的部署地址，请在 `front/.env` 写入：
    - `VITE_UNIVERSAL_APP_7001=0x...`
    - `VITE_GATEWAY_7001=0x6c533f7fe93fae114d0954697069df33c9b74fd7`
  - 修改 `.env` 后需重启前端 dev server。

### 6. 常见问题与排查
- 无法切换网络：请确认钱包允许切换至 Sepolia(11155111) 或 Athens(7001)。
- 交易超时未确认：
  - 可能是节点短时未索引/网络拥堵；前端已延长 `waitForTransactionReceipt` 超时，请在区块浏览器核对交易。
  - 检查 Athens 上调用账户是否有足够 ZETA 支付 gas。
  - 如长时间 pending，可尝试在钱包中加价重发（Speed Up/Replace）。
- 出站失败/回滚：
  - 确认 Universal App 合约地址持有对应 ZRC-20 余额（与选择的代币一致），否则 `withdraw` 将因余额不足而失败。
  - 若需要 Revert 回调，请在前端/脚本中将 `RevertOptions.callOnRevert = true` 且 `revertAddress` 指向合约地址。
- 计划 ID 无效：请从 `PlanSubmitted` 事件复制完整 `0x` 开头的 `bytes32`。

### 7. 目录与关键文件
- 前端入口：`front/src/main.tsx`、`front/src/App.tsx`
- 配置：`front/src/config/chains.ts`、`front/src/config/addresses.ts`
- 网关封装：`front/src/lib/gateway.ts`
- 测试页（手动出站）：`front/src/pages/test/outbound.tsx`
- 合约：`contracts/src/ZetaFlowUniversalApp.sol`
- 部署脚本：`contracts/script/Deploy.s.sol`、`contracts/script/SetGateway.s.sol`

### 8. 贡献规范
- 类型明确、变量命名语义化；避免缩写。
- 修改配置/地址请同步更新文档与前端映射。
- 新增页面/组件需遵循 Tailwind 与 React 现有风格，避免大范围非必要重构。


