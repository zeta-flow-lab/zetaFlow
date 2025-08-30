# ZetaFlow — AI 驱动的跨链资产再平衡（ZetaChain Universal App）

ZetaFlow 是一个基于 ZetaChain 的 Universal App 示例，支持从连接链（如 Ethereum Sepolia）入站资金到 ZetaChain（ZEVM），并在 ZEVM 上执行自动资产配置（Swap），随后将配置后的资产出站到目标链地址。前端内置 AI 指令与面板操作，支持端到端的 CCTX 监控与交易哈希回显。

## 功能总览

- 入站（EVM → ZetaChain）：支持原生 ETH 与 ERC-20 的 deposit / depositAndCall
- 自动资产配置（ZEVM）：onCall 自动解析计划并执行 Swap + Withdraw（可开关）
- 出站（ZetaChain → 目标链）：基于 ZRC-20 的 withdraw（或 withdrawAndCall）
- CCTX 监控：聊天回执中返回源链/ZEVM/目标链哈希与 Explorer 链接
- 前端 AI 指令：支持自然语言触发入站、提现与资产配置

参考文档：[Call & Deposit 教程](https://www.zetachain.com/docs/developers/tutorials/call/)

---

## 目录结构

- `contracts/` Solidity 合约、Foundry 脚本与 .env
  - `src/ZetaFlowUniversalApp.sol` Universal App 主合约（实现 onCall/自动资产配置/withdraw）
  - `src/Connected.sol` 可选：连接链转发合约（演示）
  - `script/*.s.sol` Foundry 部署与配置脚本
- `front/` 前端（Vite + React），集成 AI toolcall 与 CCTX 监控
  - `src/pages/trade/components/Chat.tsx` 聊天入口，支持自然语言指令
  - `src/pages/trade/components/InboundPanel.tsx` 入站面板（显式填写计划）
  - `src/lib/aiTools.ts` 触发入站/提现与 CCTX 轮询
  - `src/lib/toolkit.ts` 以 ethers + Gateway/Universal ABI 执行链上交互
  - `src/lib/cctx.ts` CCTX 查询与轮询

---

## 环境准备

- Node.js 18+ / pnpm 或 yarn / npm
- Foundry（forge / cast）
- 浏览器钱包（如 MetaMask），确保连接到 Sepolia 与 ZetaChain Athens 测试网

### 环境变量

- 合约侧 `contracts/.env`（已填测试网默认值）
  - `RPC_ZETACHAIN`、`RPC_SEPOLIA`
  - `GATEWAY_ZEVM`、`UNISWAP_ROUTER`
  - `UNIVERSAL_APP`（已更新为最新部署地址）
- 前端侧 `front/.env.local`
  - `VITE_UNIVERSAL_APP_7001=<最新 Universal 地址>`
  - `VITE_GATEWAY_7001=<ZEVM Gateway 地址>`

---

## 合约部署与配置

在 `contracts/` 目录下：

```
forge build

# 部署 Universal 到 ZEVM（使用 .env 中的 RPC 与 PRIVATE_KEY）
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC_ZETACHAIN \
  --broadcast --private-key $PRIVATE_KEY --legacy

# 设置 Router / Gateway / 自动执行
cast send $UNIVERSAL_APP "setRouter(address)" $UNISWAP_ROUTER \
  --rpc-url $RPC_ZETACHAIN --private-key $PRIVATE_KEY --legacy

cast send $UNIVERSAL_APP "setGateway(address)" $GATEWAY_ZEVM \
  --rpc-url $RPC_ZETACHAIN --private-key $PRIVATE_KEY --legacy

cast send $UNIVERSAL_APP "setAutoExecuteOnCall(bool)" true \
  --rpc-url $RPC_ZETACHAIN --private-key $PRIVATE_KEY --legacy
```

> 部署完成后，将新地址写回 `contracts/.env` 与 `front/.env.local`。

---

## 前端启动

在 `front/` 目录下：

```
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

- Chat：输入“入站 0.05 ETH 并配置50% BTC,50% ETH”，按提示授权与签名
- Inbound 面板：在 “计划” 输入 `["BTC","ETH"],[5000,5000]`，金额填 0.05，点击发送

> 合约 `autoExecuteOnCall=true` 时，onCall 收到 `(string[], uint256[])` 计划后会自动完成 Swap 与 Withdraw。

---

## CCTX 状态与交易哈希

入站成功后，聊天回执会显示：
- 源链 Tx（Sepolia）
- ZEVM Tx（ZetaChain Athens）

自动资产配置与出站完成后，将补充：
- 目标链 Tx（如 Sepolia/目标 EVM）

前端会轮询 CCTX 接口，确保回传的是“权威哈希”映射（非随意事件日志）。

---

## 常见问题

- 未弹出签名/钱包未授权：请在钱包扩展中“连接网站”，并统一使用 `http://localhost:5173` 访问（避免 127.0.0.1 与 localhost 混用导致来源不一致）。
- 计划未执行：确保 planData 为严格的 `(string[], uint256[])`，且权重和为 10000（如 50% → 5000）。
- 流动性不足导致 Swap 失败：可调整路径或直接 withdraw 到目标链（跳过 Swap）。
- 目标链 Tx 未出现：CCTX 需要时间确认，请等待轮询；也可手动用 CLI 查询：

```
zetachain query cctx --hash <源链或ZEVM txHash>
```

---

## 重要合约地址（Athens 测试网）

- Gateway (ZEVM): `0x6c533f7fe93fae114d0954697069df33c9b74fd7`
- UniswapV2 Router: `0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe`
- sETH.Sepolia (ZRC-20): `0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0`
- Universal（最近部署）: 以 `contracts/.env` 与 `front/.env.local` 为准

---

## 参考与致谢

- ZetaChain 官方教程（Call & Deposit / Withdraw / Messaging 等）
  - Call & Deposit: https://www.zetachain.com/docs/developers/tutorials/call/
- Uniswap V2（测试网流动性有限，生产需检查路径与滑点）

---
