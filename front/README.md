# ZetaFlow — AI 交易前端（单文件 Demo 拆分版）

一个基于 React + TypeScript + Vite 的交互式交易演示前端，展示「一句话，随时随地交易」的产品理念。界面与交互已按需求更新，并拆分为 Header / Chat / Footer 组件。

预览地址（本地开发启动后）：
- 默认：http://localhost:5173/（端口占用会自动递增）

## 功能概览
- 标题高亮、描述“由 ZetaChain x Gemini 强力驱动”、链标签仅显示链名
- 聊天交互：
  - 初始提示：“今天有什么能帮到您？”
  - 输入占位：“示例：请你将我钱包中的 10 ZETA 按照当前市场价格换成 POL”
  - 实时解析预览：展示自然语言解析结果（JSON）
  - 指令解析：创建钱包 / 兑换 / 余额查询
  - 触发对应模态：创建智能账户（演示）、跨链兑换（演示）
- 特色卡片：原生资产、AI 代理、安全可控
- 模态：连接钱包（MetaMask、行动密钥占位）、创建智能账户、跨链兑换
- 视觉：动态背景光斑、玻璃拟物卡片、轻量 Toast 提示

## 目录结构（关键）
```
src/
  App.tsx                     # 挂载入口，渲染 ZetaFlow
  pages/
    trade/
      trade.tsx              # 主页面容器（状态、逻辑与布局）
      Header.tsx             # 顶栏组件（连接钱包、项目名、标记）
      Chat.tsx               # 聊天列表组件
      Footer.tsx             # 底部版权组件
```

## 技术栈
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4（类名式样式）
- framer-motion（动效）
- lucide-react（图标）

## 快速开始
1) 安装依赖（首次）
```bash
npm i
```

2) 启动开发服务器
```bash
npm run dev
```
终端会输出本地地址，浏览器打开即可预览（如端口被占用会自动切换到 5174/5175/…）。

## 可用脚本
```bash
npm run dev       # 启动开发服务器
npm run build     # TypeScript 构建 + 产物打包
npm run preview   # 预览打包产物
npm run lint      # 运行 ESLint
```

## 自然语言指令示例
- 创建钱包：
  - “创建钱包” / “create wallet on ZetaChain”
- 余额查询：
  - “查询余额” / “balance of ZETA on ZetaChain”
- 兑换（跨链）：
  - “swap 1 ETH to BTC on Ethereum to Bitcoin”
  - “把 10 ZETA 换成 POL 在 ZetaChain 到 Polygon”

## 组件拆分说明（本次改动）
- 将原单文件页面拆分为：`Header.tsx`、`Chat.tsx`、`Footer.tsx`，并在 `trade.tsx` 中引用。
- 移除本地重复的 `ChatList` 定义，避免命名冲突；清理未使用图标导入，减少 lint 警告。

## 常见问题
- 提示 “Cannot find module 'framer-motion'”
  - 执行：`npm i framer-motion lucide-react`，然后 `npm run dev`
- 页面未渲染 ZetaFlow
  - 确保 `src/App.tsx` 已 `import ZetaFlow from "./pages/trade/trade"` 并在 JSX 中返回 `<ZetaFlow />`
- 端口被占用
  - Vite 会自动切换端口，关注终端输出的 Local 地址即可

## 许可证
本仓库以演示为目的，未附加开源许可证。如需商用或二次开发，请先与作者沟通。
