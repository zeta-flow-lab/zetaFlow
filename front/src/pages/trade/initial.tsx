import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Wallet, ArrowLeftRight, Send, X, Loader2, Check, Copy,
  Rocket, Bot, Shield, ChevronDown, ChevronRight, KeyRound, Globe
} from "lucide-react";

/**
* ZetaFlow — 多语言 + 动效版
* 本次更新：
* 1) 英雄标题（英文）加入打字机动画；结束后高亮色“.”持续闪烁
* 2) 链标签增加左→右的平行动画轮播（优雅、可无障碍降级）
* 3) 语言切换修复：提升层级到 z-[70]，纯色背景避免“重影”，确保在英雄标题之上
* 4) “Cmd/K 打开命令面板”改为“打开命令面板”，点击即弹出命令面板
* 其余保持不变
*/

// —— 设计令牌（主题配色）——
const theme = {
  bg: "#0B0B0E",
  surface: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.12)",
  text: "#EDEDED",
  subtext: "#B8BDC7",
  accent: "#025b45",
  accentSoft: "#0F8F73",
  green: "#b0ff61",
  warning: "#0F8F73",
  danger: "#FF5C7C",
};

// —— 语言 & 文案 ——
// lang labels：English / 简体中文 / 한국어 / 日本語
type Lang = "en" | "zh" | "ko" | "ja";

const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  zh: "简体中文",
  ko: "한국어",
  ja: "日本語",
};

const I18N: Record<Lang, any> = {
  en: {
    header: {
      cmd: "Open command palette",
      tagline: "Build Once, Launch Everywhere — with Gemini.",
      connect: "Connect Wallet",
    },
    hero: {
      titlePrefix: "One prompt, ",
      titleHighlight: "trade anywhere",
      byline: "Powered by ZetaChain × Gemini",
    },
    chat: {
      title: "ZetaFlow Copilot",
      badge: "Gemini 2.5",
      initial: "How can I help you today?",
      placeholder: "Example: Swap 10 ZETA in my wallet to POL at the current market price",
      send: "Send",
      parsedAs: "Parsed as:",
    },
    connectModal: {
      title: "Connect Wallet",
      metaMask: "Connect MetaMask",
      metaMaskDesc: "Browser extension or mobile",
      actionKey: "Use Action Key",
      actionKeyDesc: "Action Key / Passkey login",
      note:
        "We don’t store your private key. Before submitting, you’ll see a human-readable summary and simulation results.",
      close: "Close",
    },
    createModal: {
      title: "Create Smart Account (Demo)",
      note:
        "During creation you’ll see a human-readable signature and risk checks. Example address:",
      cancel: "Cancel",
      confirm: "Confirm",
    },
    swapModal: {
      title: "Cross-Chain Swap (Demo)",
      fromChain: "From Chain",
      toChain: "Destination Chain",
      pay: "Pay",
      receive: "Receive",
      estOut: "Estimated output",
      info:
        "Before submitting, you’ll see route/fees/slippage/simulation and a human-readable summary (demo placeholder).",
      cancel: "Cancel",
      confirm: "Confirm Swap (Demo)",
    },
    features: {
      f1_title: "Native Assets",
      f1_tag: "ZetaChain Universal Capability",
      f1_desc:
        "A universal blockchain lets assets reach multiple chains and Bitcoin natively with a single deployment",
      f2_title: "AI Agent",
      f2_tag: "Gemini Intelligence",
      f2_desc:
        "Directly analyzes trading intent from natural language and executes reliably",
      f3_title: "Secure & Controllable",
      f3_tag: "ZetaFlow Risk Controls",
      f3_desc:
        "Extensible pre-checks and risk rules safeguard your assets",
    },
    toasts: {
      createDemo:
        "Wallet creation is demo only; no real on-chain transaction.",
      swapDemo:
        "Cross-chain swap is a UI demo; wire backend/contracts to go live.",
      copied: "Copied to clipboard",
    },
    msgs: {
      create: (n: string) =>
        `Will create a smart account on ${n || "ZetaChain"} (demo).`,
      swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
        `Preparing to swap ${amt ?? "?"} ${from} to ${to} (${s || "?"} → ${d || "?"}).`,
      balance: (token?: string, chain?: string) =>
        `Querying ${chain || "ZetaChain"} for ${token || "all"} balance (demo).`,
      fallback:
        "I didn’t quite get that. Try: create wallet | check balance | swap 1 ETH to BTC on Bitcoin",
    },
  },

  zh: {
    header: {
      cmd: "打开命令面板",
      tagline: "Build Once, Launch Everywhere — with Gemini.",
      connect: "连接钱包",
    },
    hero: {
      titlePrefix: "一句话，",
      titleHighlight: "随时随地交易",
      byline: "由 ZetaChain x Gemini 强力驱动",
    },
    chat: {
      title: "ZetaFlow Copilot",
      badge: "Gemini 2.5",
      initial: "今天有什么能帮到您？",
      placeholder: "示例：请你将我钱包中的 10 ZETA 按照当前市场价格换成 POL",
      send: "发送",
      parsedAs: "解析为：",
    },
    connectModal: {
      title: "连接钱包",
      metaMask: "连接 MetaMask",
      metaMaskDesc: "浏览器扩展或移动端",
      actionKey: "使用行动密钥",
      actionKeyDesc: "Action Key / Passkey 登录",
      note:
        "我们不会保存你的私钥。提交前可看到人类可读摘要与模拟结果。",
      close: "关闭",
    },
    createModal: {
      title: "创建智能账户（演示）",
      note:
        "创建时将展示人类可读签名与风险检查。示例地址：",
      cancel: "取消",
      confirm: "确认创建",
    },
    swapModal: {
      title: "跨链兑换（演示）",
      fromChain: "源链",
      toChain: "目标链",
      pay: "支付",
      receive: "获得",
      estOut: "估算输出",
      info:
        "提交前会展示交易路径/费率/滑点/模拟结果与人类可读摘要（演示占位）。",
      cancel: "取消",
      confirm: "确认兑换（演示）",
    },
    features: {
      f1_title: "原生资产",
      f1_tag: "ZetaChain 通用能力",
      f1_desc:
        "通用区块链让资产一次部署即可原生触达多链与比特币",
      f2_title: "AI 代理",
      f2_tag: "Gemini 智慧能力",
      f2_desc:
        "从自然语言直接分析交易意图并进行可靠执行",
      f3_title: "安全可控",
      f3_tag: "ZetaFlow风控能力",
      f3_desc:
        "可扩展的预检与风控规则为资产安全保驾护航",
    },
    toasts: {
      createDemo: "创建钱包仅为前端演示，未发起真实链上事务。",
      swapDemo: "跨链兑换为演示 UI；接入后端/合约即可落地。",
      copied: "已复制到剪贴板",
    },
    msgs: {
      create: (n: string) => `将为你在 ${n || "ZetaChain"} 上创建智能账户（演示）。`,
      swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
        `准备将 ${amt ?? "?"} ${from} 兑换为 ${to}（${s || "?"} → ${d || "?"}）。`,
      balance: (token?: string, chain?: string) =>
        `正在查询 ${chain || "ZetaChain"} 上 ${token || "所有"} 余额（演示）。`,
      fallback:
        "我没完全听懂。你可以试试：创建钱包｜查询余额｜swap 1 ETH to BTC on Bitcoin",
    },
  },

  ko: {
    header: {
      cmd: "명령 팔레트 열기",
      tagline: "Build Once, Launch Everywhere — with Gemini.",
      connect: "지갑 연결",
    },
    hero: {
      titlePrefix: "한 문장으로, ",
      titleHighlight: "어디서나 거래",
      byline: "ZetaChain × Gemini로 구동됩니다",
    },
    chat: {
      title: "ZetaFlow Copilot",
      badge: "Gemini 2.5",
      initial: "무엇을 도와드릴까요?",
      placeholder: "예: 내 지갑의 10 ZETA를 현재 시세로 POL로 교환해줘",
      send: "전송",
      parsedAs: "해석 결과:",
    },
    connectModal: {
      title: "지갑 연결",
      metaMask: "MetaMask 연결",
      metaMaskDesc: "브라우저 확장 또는 모바일",
      actionKey: "액션 키 사용",
      actionKeyDesc: "Action Key / Passkey 로그인",
      note:
        "개인키는 저장하지 않습니다. 제출 전 사람에게 읽기 쉬운 요약과 시뮬레이션 결과를 확인할 수 있습니다.",
      close: "닫기",
    },
    createModal: {
      title: "스마트 계정 생성 (데모)",
      note:
        "생성 과정에서 사람이 읽을 수 있는 서명과 리스크 체크를 보여줍니다. 예시 주소:",
      cancel: "취소",
      confirm: "생성 확인",
    },
    swapModal: {
      title: "크로스체인 스왑 (데모)",
      fromChain: "출발 체인",
      toChain: "도착 체인",
      pay: "지불",
      receive: "수령",
      estOut: "예상 수량",
      info:
        "제출 전에 경로/수수료/슬리피지/시뮬레이션과 사람에게 읽기 쉬운 요약을 보여줍니다(데모).",
      cancel: "취소",
      confirm: "스왑 확인(데모)",
    },
    features: {
      f1_title: "네이티브 자산",
      f1_tag: "ZetaChain 범용 기능",
      f1_desc:
        "범용 블록체인은 한 번의 배포로 여러 체인과 비트코인에 네이티브 도달을 가능하게 합니다",
      f2_title: "AI 에이전트",
      f2_tag: "Gemini 인텔리전스",
      f2_desc:
        "자연어에서 거래 의도를 직접 분석하여 신뢰성 있게 실행합니다",
      f3_title: "보안 및 제어 가능",
      f3_tag: "ZetaFlow 리스크 컨트롤",
      f3_desc:
        "확장 가능한 사전 점검과 리스크 규칙으로 자산을 보호합니다",
    },
    toasts: {
      createDemo: "지갑 생성은 데모입니다. 실제 온체인 트랜잭션은 발생하지 않습니다.",
      swapDemo: "크로스체인 스왑은 UI 데모입니다. 백엔드/컨트랙트를 연결하세요.",
      copied: "클립보드에 복사됨",
    },
    msgs: {
      create: (n: string) => `${n || "ZetaChain"} 에 스마트 계정을 생성합니다(데모).`,
      swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
        `${amt ?? "?"} ${from} 를 ${to} 로 스왑 준비 중 (${s || "?"} → ${d || "?"}).`,
      balance: (token?: string, chain?: string) =>
        `${chain || "ZetaChain"} 에서 ${token || "전체"} 잔액 조회(데모).`,
      fallback:
        "잘 이해하지 못했어요. 예: 지갑 생성 | 잔액 조회 | swap 1 ETH to BTC on Bitcoin",
    },
  },

  ja: {
    header: {
      cmd: "コマンドパレットを開く",
      tagline: "Build Once, Launch Everywhere — with Gemini.",
      connect: "ウォレット接続",
    },
    hero: {
      titlePrefix: "ひとことで、",
      titleHighlight: "どこでも取引",
      byline: "ZetaChain × Gemini によって駆動",
    },
    chat: {
      title: "ZetaFlow Copilot",
      badge: "Gemini 2.5",
      initial: "本日どのようにお手伝いできますか？",
      placeholder: "例：ウォレットの 10 ZETA を現在の市場価格で POL に交換して",
      send: "送信",
      parsedAs: "解析結果：",
    },
    connectModal: {
      title: "ウォレット接続",
      metaMask: "MetaMask に接続",
      metaMaskDesc: "ブラウザ拡張機能またはモバイル",
      actionKey: "アクションキーを使用",
      actionKeyDesc: "Action Key / Passkey ログイン",
      note:
        "秘密鍵は保存しません。送信前に人間可読の要約とシミュレーション結果を表示します。",
      close: "閉じる",
    },
    createModal: {
      title: "スマートアカウント作成（デモ）",
      note:
        "作成時に人間可読の署名とリスクチェックを表示します。サンプルアドレス：",
      cancel: "キャンセル",
      confirm: "作成を確認",
    },
    swapModal: {
      title: "クロスチェーンスワップ（デモ）",
      fromChain: "送信元チェーン",
      toChain: "送信先チェーン",
      pay: "支払う",
      receive: "受け取る",
      estOut: "推定出力",
      info:
        "送信前にルート/手数料/スリッページ/シミュレーションおよび人間可読の要約を表示します（デモ）。",
      cancel: "キャンセル",
      confirm: "スワップを確認（デモ）",
    },
    features: {
      f1_title: "ネイティブ資産",
      f1_tag: "ZetaChain ユニバーサル機能",
      f1_desc:
        "ユニバーサルなブロックチェーンにより、一度のデプロイで複数チェーンとBitcoinへネイティブ到達",
      f2_title: "AI エージェント",
      f2_tag: "Gemini インテリジェンス",
      f2_desc:
        "自然言語から取引意図を直接解析し、確実に実行します",
      f3_title: "安全で制御可能",
      f3_tag: "ZetaFlow リスク管理",
      f3_desc:
        "拡張可能な事前チェックとリスクルールで資産を保護します",
    },
    toasts: {
      createDemo: "ウォレット作成はデモです。実際のオンチェーントランザクションは行いません。",
      swapDemo: "クロスチェーンスワップはUIデモです。バックエンド/コントラクトを接続してください。",
      copied: "クリップボードにコピーしました",
    },
    msgs: {
      create: (n: string) => `${n || "ZetaChain"} 上にスマートアカウントを作成します（デモ）。`,
      swap: (amt: any, from: string, to: string, s?: string, d?: string) =>
        `${amt ?? "?"} ${from} を ${to} にスワップ準備中（${s || "?"} → ${d || "?"}）。`,
      balance: (token?: string, chain?: string) =>
        `${chain || "ZetaChain"} で ${token || "すべて"} の残高を照会（デモ）。`,
      fallback:
        "うまく理解できませんでした。例：create wallet｜check balance｜swap 1 ETH to BTC on Bitcoin",
    },
  },
};

// —— 链清单（页面显示仅链名）——
const CHAINS = [
  { id: "zetachain", name: "ZetaChain", color: theme.accent, tag: "Universal EVM" },
  { id: "bsc", name: "BSC", color: theme.accentSoft, tag: "Mainnet" },
  { id: "ethereum", name: "Ethereum", color: theme.accentSoft, tag: "Mainnet" },
  { id: "polygon", name: "Polygon", color: theme.accentSoft, tag: "PoS" },
  { id: "bitcoin", name: "Bitcoin", color: theme.green, tag: "L1" },
  { id: "base", name: "Base", color: theme.accentSoft, tag: "L2" },
  { id: "solana", name: "Solana", color: theme.green, tag: "L1" },
  { id: "arbitrum", name: "Arbitrum", color: theme.accentSoft, tag: "L2" },
  { id: "avalanche", name: "Avalanche", color: theme.accentSoft, tag: "L1" },
  { id: "sui", name: "Sui", color: theme.accentSoft, tag: "L1" },
  { id: "ton", name: "TON", color: theme.accentSoft, tag: "L1" },
];

const TOKENS = [
  { symbol: "ZETA", name: "Zeta Token", chain: "zetachain" },
  { symbol: "ETH", name: "Ether", chain: "ethereum" },
  { symbol: "BTC", name: "Bitcoin", chain: "bitcoin" },
  { symbol: "USDC", name: "USD Coin", chain: "ethereum" },
];

// —— 工具 ——
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Action =
  | { type: "create_wallet"; network?: string }
  | { type: "swap"; from: string; to: string; amount?: number; srcChain?: string; dstChain?: string }
  | { type: "balance"; token?: string; chain?: string }
  | { type: "unknown" };

function parseCommand(inputRaw: string): Action {
  const input = inputRaw.trim().toLowerCase();
  if (!input) return { type: "unknown" };

  if (/^(创建|開|开|生成|create)\s*(钱包|wallet)/.test(input) || /create wallet/.test(input)) {
    const m = input.match(/(on|在)\s*(zetachain|ethereum|bitcoin|solana)/);
    return { type: "create_wallet", network: m?.[2] };
  }

  if (/余额|balance/.test(input)) {
    const token = (input.match(/(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const chain = input.match(/(在|on)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    return { type: "balance", token, chain };
  }

  if (/swap|兑换|兌換|换/.test(input)) {
    const amt = Number(input.match(/(\d+\.?\d*)\s*(zeta|eth|btc|usdc)/)?.[1]);
    const from = (input.match(/\d+\.?\d*\s*(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const to = (input.match(/to\s*(zeta|eth|btc|usdc)/)?.[1] || input.match(/成\s*(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const srcChain = input.match(/(在|on)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    const dstChain = input.match(/(到|to)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    if (from && to) return { type: "swap", from, to, amount: isNaN(amt) ? undefined : amt, srcChain, dstChain };
  }
  return { type: "unknown" };
}

// —— 通用 UI ——
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border backdrop-blur-xl ${className}`} style={{ borderColor: theme.line, background: theme.surface }}>
      {children}
    </div>
  );
}

function Tag({ label, color = theme.subtext }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
      style={{ background: "rgba(255,255,255,0.06)", color }}>
      <Sparkles size={14} /> {label}
    </span>
  );
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs"
      style={{ background: color + "1A", color }}>
      {text}
    </span>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; icon?: React.ReactNode; text: string }[]>([]);
  const push = (t: { icon?: React.ReactNode; text: string }) => setToasts((s) => [...s, { ...t, id: Date.now() + Math.random() }]);
  const remove = (id: number) => setToasts((s) => s.filter((x) => s.indexOf(x) >= 0 && x.id !== id));
  return { toasts, push, remove } as const;
}

function Toasts({ list, onClose }: { list: { id: number; icon?: React.ReactNode; text: string }[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <div className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ background: theme.surface, borderColor: theme.line }}>
              {t.icon}
              <span className="text-sm" style={{ color: theme.text }}>{t.text}</span>
              <button className="ml-2 opacity-70 hover:opacity-100" onClick={() => onClose(t.id)}><X size={16} /></button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }} onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.24 }}
          className="fixed left-1/2 top-1/2 z-50 w-[min(680px,96vw)] -translate-x-1/2 -translate-y-1/2"
        >
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: theme.text }}>{title}</h3>
              <button className="opacity-70 hover:opacity-100" onClick={onClose}><X /></button>
            </div>
            {children}
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// —— 主页面 ——
export default function ZetaFlow() {
  const [lang, setLang] = useState<Lang>("en");
  const STR = I18N[lang];

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: I18N.en.chat.initial }, // 默认英文
  ]);
  const [busy, setBusy] = useState(false);

  const [swapOpen, setSwapOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [commandPreview, setCommandPreview] = useState<Action | null>(null);

  const { toasts, push, remove } = useToasts();

  useEffect(() => {
    setCommandPreview(input ? parseCommand(input) : null);
  }, [input]);

  async function handleSend() {
    if (!input.trim()) return;
    const action = parseCommand(input);
    setMessages((m) => [...m, { role: "user", text: input }]);
    setInput("");
    setBusy(true);
    await sleep(480);

    switch (action.type) {
      case "create_wallet": {
        setMessages((m) => [...m, { role: "assistant", text: STR.msgs.create(action.network || "ZetaChain") }]);
        setCreateOpen(true);
        push({ icon: <Shield size={16} />, text: STR.toasts.createDemo });
        break;
      }
      case "swap": {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: STR.msgs.swap(action.amount, action.from, action.to, action.srcChain, action.dstChain) },
        ]);
        setSwapOpen(true);
        push({ icon: <ArrowLeftRight size={16} />, text: STR.toasts.swapDemo });
        break;
      }
      case "balance": {
        setMessages((m) => [...m, { role: "assistant", text: STR.msgs.balance(action.token, action.chain) }]);
        break;
      }
      default: {
        setMessages((m) => [...m, { role: "assistant", text: STR.msgs.fallback }]);
      }
    }
    setBusy(false);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    push({ icon: <Copy size={16} />, text: STR.toasts.copied });
  }

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: theme.bg }}>
      {/* 全局样式：打字闪烁 + 轮播 */}
      <style>{`
@keyframes blink { 0%, 50% {opacity: 1} 50.01%, 100% {opacity: 0} }
.blink { animation: blink 1s steps(1, end) infinite; }
@keyframes marquee-ltr { 0% { transform: translateX(-50%); } 100% { transform: translateX(0%); } }
.animate-marquee-ltr { animation: marquee-ltr 28s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .blink { animation: none !important; }
  .animate-marquee-ltr { animation: none !important; transform: none !important; }
}
`}</style>

      <BackgroundOrbs />

      {/* 顶栏 —— 提升层级，确保下拉在英雄标题之上 */}
      <header className="relative isolate z-[60] mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: theme.accent + "26" }}>
            <Rocket style={{ color: theme.green }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight" style={{ color: theme.text }}>ZetaFlow</span>
              <Tag label="Hackathon Preview" color={theme.subtext} />
            </div>
            <div className="text-xs" style={{ color: theme.subtext }}>{STR.header.tagline}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 将语言切换器放到原“命令面板”按钮的位置 */}
          <LanguageSwitcher lang={lang} onChange={setLang} />

          <button
            className="rounded-xl px-3 py-2 text-sm font-medium"
            style={{ background: theme.accent, color: theme.text }}
            onClick={() => setConnectOpen(true)}
          >
            <div className="flex items-center gap-1"><Wallet size={16} /> {STR.header.connect}</div>
          </button>
        </div>
      </header>

      {/* 英雄区 */}
      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-28 pt-6">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* 英雄标题：英文带打字动画；其他语言保持静态 */}
          {lang === "en" ? (
            <TypewriterTitle
              prefix={I18N.en.hero.titlePrefix}
              highlight={I18N.en.hero.titleHighlight}
              color={theme.green}
            />
          ) : (
            <motion.h1
              className="mb-3 text-4xl font-semibold leading-tight md:text-5xl"
              style={{ color: theme.text }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {STR.hero.titlePrefix}
              <span style={{ color: theme.green }}>{STR.hero.titleHighlight}</span>
            </motion.h1>
          )}

          <p className="max-w-2xl text-balance text-base" style={{ color: theme.subtext }}>
            {STR.hero.byline}
          </p>

          {/* 链标签轮播：从左到右 */}
          <div className="mt-5 w-full overflow-hidden">
            <div
              className="animate-marquee-ltr flex gap-2 min-w-max px-1"
              style={{ willChange: "transform" }}
            >
              {[...CHAINS, ...CHAINS].map((c, i) => (
                <Pill key={`${c.id}-${i}`} text={c.name} color={c.color} />
              ))}
            </div>
          </div>
        </div>

        {/* 会话卡片（放宽） */}
        <GlassCard className="mx-auto w-full max-w-4xl p-2 md:p-3">
          <div className="relative rounded-2xl border p-3 md:p-6" style={{ borderColor: theme.line }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Bot size={18} />
                </div>
                <div className="text-sm font-medium" style={{ color: theme.text }}>{STR.chat.title}</div>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.subtext }}>
                <Shield size={14} /> {STR.chat.badge}
              </div>
            </div>

            <div className="mb-4 h-[38vh] max-h-[420px] overflow-y-auto pr-1">
              <ChatList messages={messages} />
            </div>

            {/* 输入区 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-2xl border px-3 py-2 md:px-4 md:py-3"
                style={{ borderColor: theme.line, background: "rgba(255,255,255,0.03)" }}>
                <KeyRound size={18} className="opacity-80" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={STR.chat.placeholder}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
                  style={{ color: theme.text }}
                />
                <button
                  onClick={handleSend}
                  className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60"
                  disabled={busy}
                  style={{ background: theme.accent, color: theme.text }}
                >
                  <Send size={16} className={busy ? "animate-pulse" : ""} /> {STR.chat.send}
                </button>
              </div>

              {/* 即时解析预览 */}
              <AnimatePresence>
                {commandPreview && commandPreview.type !== "unknown" && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 text-xs"
                    style={{ color: theme.subtext }}
                  >
                    <ChevronRight size={14} />
                    <span>{STR.chat.parsedAs}</span>
                    <code className="rounded-md px-2 py-1" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }}>
                      {JSON.stringify(commandPreview)}
                    </code>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassCard>

        {/* 三列优势 */}
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard icon={<ArrowLeftRight />} title={STR.features.f1_title} desc={STR.features.f1_desc} tag={STR.features.f1_tag} />
          <FeatureCard icon={<Bot />} title={STR.features.f2_title} desc={STR.features.f2_desc} tag={STR.features.f2_tag} />
          <FeatureCard icon={<Shield />} title={STR.features.f3_title} desc={STR.features.f3_desc} tag={STR.features.f3_tag} />
        </div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14 text-xs" style={{ color: theme.subtext }}>
        <div className="opacity-80">ZetaFlow © 2025 · Demo UI · Inspired by ZetaChain brand ethos</div>
      </footer>

      {/* 模态：连接钱包 */}
      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title={STR.connectModal.title}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ConnectOption
              icon={<Wallet />}
              title={STR.connectModal.metaMask}
              desc={STR.connectModal.metaMaskDesc}
              onClick={() => { setConnectOpen(false); }}
            />
            <ConnectOption
              icon={<KeyRound />}
              title={STR.connectModal.actionKey}
              desc={STR.connectModal.actionKeyDesc}
              onClick={() => { setConnectOpen(false); }}
            />
          </div>
          <div className="rounded-xl border p-3 text-xs" style={{ borderColor: theme.line, color: theme.subtext }}>
            {STR.connectModal.note}
          </div>
          <div className="flex items-center justify-end">
            <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }} onClick={() => setConnectOpen(false)}>
              {STR.connectModal.close}
            </button>
          </div>
        </div>
      </Modal>

      {/* 模态：创建钱包（自然语言触发） */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={STR.createModal.title}>
        <div className="space-y-4">
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: theme.line, color: theme.subtext }}>
            {STR.createModal.note}
            <div className="mt-2 flex items-center justify-between rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <span className="font-mono" style={{ color: theme.text }}>zeta1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</span>
              <button onClick={() => copy("zeta1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")} className="opacity-80 hover:opacity-100">
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }} onClick={() => setCreateOpen(false)}>
              {STR.createModal.cancel}
            </button>
            <button className="rounded-xl px-3 py-2 text-sm font-medium" style={{ background: theme.accent, color: theme.text }} onClick={() => setCreateOpen(false)}>
              {STR.createModal.confirm}
            </button>
          </div>
        </div>
      </Modal>

      {/* 模态：Swap（演示） */}
      <Modal open={swapOpen} onClose={() => setSwapOpen(false)} title={STR.swapModal.title}>
        <SwapForm onClose={() => setSwapOpen(false)} STR={STR} />
      </Modal>
    </div>
  );
}

/* ====== 子组件 ====== */

function LanguageSwitcher({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // 点击外部关闭
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    // 提升容器层级，避免被英雄标题覆盖
    <div className="relative z-[70]" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
        style={{ borderColor: theme.line, background: "rgba(255,255,255,0.06)", color: theme.text }}
      >
        <Globe size={16} />
        {LANG_LABEL[lang]}
        <ChevronDown size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            // 面板再抬高一层，并使用纯色背景避免“重影”
            className="absolute right-0 z-[80] mt-2 w-44 overflow-hidden rounded-xl border"
            style={{ borderColor: theme.line, background: theme.bg, boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}
          >
            {(["en", "zh", "ko", "ja"] as Lang[]).map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => { onChange(l); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:opacity-100"
                style={{ color: theme.text, opacity: lang === l ? 1 : 0.85 }}
              >
                {LANG_LABEL[l]}
                {lang === l && <Check size={16} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatList({ messages }: { messages: { role: "user" | "assistant"; text: string }[] }) {
  return (
    <div className="space-y-3">
      {messages.map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
          <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm md:px-4 md:py-3 ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
              style={{
                background: m.role === "user" ? theme.accent : "rgba(255,255,255,0.06)",
                color: theme.text
              }}
            >
              <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed">{m.text}</pre>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FeatureCard({ icon, title, desc, tag }: { icon: React.ReactNode; title: string; desc: string; tag: string }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
          {React.cloneElement(icon as any, { size: 20 })}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h4 className="text-base font-semibold" style={{ color: theme.text }}>{title}</h4>
            <Tag label={tag} />
          </div>
          <p className="text-sm" style={{ color: theme.subtext }}>{desc}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function Select({ label, options }: { label: string; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(options[0]?.value);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="space-y-1">
      <div className="text-xs opacity-80" style={{ color: theme.subtext }}>{label}</div>
      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between rounded-xl border px-3 py-2"
          style={{ borderColor: theme.line, background: "rgba(255,255,255,0.04)", color: theme.text }}>
          <span>{selected?.label}</span>
          <ChevronDown size={16} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border"
              style={{ borderColor: theme.line, background: theme.bg }}>
              {options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { setValue(o.value); setOpen(false); }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:opacity-100"
                  style={{ color: theme.text, opacity: selected?.value === o.value ? 1 : 0.8 }}
                >
                  {o.label}
                  {selected?.value === o.value && <Check size={16} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SwapForm({ onClose, STR }: { onClose: () => void; STR: any }) {
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("BTC");
  const [amount, setAmount] = useState("1");
  const [src, setSrc] = useState("ethereum");
  const [dst, setDst] = useState("bitcoin");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Number(amount) > 0 && fromToken && toToken && src && dst;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    await sleep(1000);
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label={STR.swapModal.fromChain}>
          <select value={src} onChange={(e) => setSrc(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2"
            style={{ borderColor: theme.line, color: theme.text }}>
            {CHAINS.map((c) => (<option key={c.id} value={c.id} style={{ background: theme.bg }}>{c.name}</option>))}
          </select>
        </Field>
        <Field label={STR.swapModal.toChain}>
          <select value={dst} onChange={(e) => setDst(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2"
            style={{ borderColor: theme.line, color: theme.text }}>
            {CHAINS.map((c) => (<option key={c.id} value={c.id} style={{ background: theme.bg }}>{c.name}</option>))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label={STR.swapModal.pay}>
          <div className="flex items-center gap-2">
            <select value={fromToken} onChange={(e) => setFromToken(e.target.value)} className="rounded-xl border bg-transparent px-3 py-2"
              style={{ borderColor: theme.line, color: theme.text }}>
              {TOKENS.map((t) => (<option key={t.symbol} value={t.symbol} style={{ background: theme.bg }}>{t.symbol}</option>))}
            </select>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 rounded-xl border bg-transparent px-3 py-2"
              style={{ borderColor: theme.line, color: theme.text }} />
          </div>
        </Field>
        <Field label={STR.swapModal.receive}>
          <div className="flex items-center gap-2">
            <select value={toToken} onChange={(e) => setToToken(e.target.value)} className="rounded-xl border bg-transparent px-3 py-2"
              style={{ borderColor: theme.line, color: theme.text }}>
              {TOKENS.map((t) => (<option key={t.symbol} value={t.symbol} style={{ background: theme.bg }}>{t.symbol}</option>))}
            </select>
            <div className="flex-1 rounded-xl border px-3 py-2 text-sm opacity-80" style={{ borderColor: theme.line, color: theme.text }}>
              {STR.swapModal.estOut}
            </div>
          </div>
        </Field>
      </div>

      <div className="rounded-xl border p-3 text-xs" style={{ borderColor: theme.line, color: theme.subtext }}>
        {STR.swapModal.info}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }} onClick={onClose}>
          {STR.swapModal.cancel}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60"
          disabled={!canSubmit || submitting}
          style={{ background: theme.accent, color: theme.text }}
          onClick={submit}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />} {STR.swapModal.confirm}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs opacity-80" style={{ color: theme.subtext }}>{label}</div>
      {children}
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <motion.div
        className="absolute left-[-10%] top-[-10%] h-[480px] w-[480px] rounded-full blur-3xl"
        initial={{ opacity: 0.35, x: -40, y: -20 }}
        animate={{ opacity: 0.5, x: [-40, 10, -30], y: [-20, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        style={{ background: `radial-gradient(35% 35% at 50% 50%, ${theme.accent}66, transparent 70%)` }}
      />
      <motion.div
        className="absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full blur-3xl"
        initial={{ opacity: 0.25, x: 20, y: 0 }}
        animate={{ opacity: 0.35, x: [20, -15, 10], y: [0, 20, -10] }}
        transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
        style={{ background: `radial-gradient(35% 35% at 50% 50%, ${theme.accentSoft}55, transparent 70%)` }}
      />
      <motion.div
        className="absolute bottom-[-20%] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        initial={{ opacity: 0.15, y: 20 }}
        animate={{ opacity: 0.22, y: [20, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, repeatType: "mirror" }}
        style={{ background: `radial-gradient(35% 35% at 50% 50%, ${theme.green}55, transparent 70%)` }}
      />
      <div className="absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "3px 3px", color: "#FFFFFF" }} />
    </div>
  );
}

function ConnectOption({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border p-4 text-left transition-transform hover:scale-[1.01]"
      style={{ borderColor: theme.line, background: "rgba(255,255,255,0.04)", color: theme.text }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: theme.accent + "26" }}>
        {React.cloneElement(icon as any, { size: 18, color: theme.green })}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs opacity-80" style={{ color: theme.subtext }}>{desc}</div>
      </div>
      <ChevronRight size={16} />
    </button>
  );
}

/* ====== 英雄标题：英文打字机 + 闪烁点 ====== */
function TypewriterTitle({ prefix, highlight, color }: { prefix: string; highlight: string; color: string }) {
  const full = prefix + highlight;
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  // 只在第一次访问打字（localStorage 记忆）
  useEffect(() => {
    const flag = localStorage.getItem("zf_typed_v1");
    if (flag === "1") { setIdx(full.length); setDone(true); return; }

    let i = 0;
    const int = setInterval(() => {
      i += 1;
      setIdx(i);
      if (i >= full.length) {
        clearInterval(int);
        setDone(true);
        localStorage.setItem("zf_typed_v1", "1");
      }
    }, 45); // 速度
    return () => clearInterval(int);
  }, [full]);

  const vis = full.slice(0, idx);
  const visPrefix = vis.slice(0, Math.min(prefix.length, idx));
  const visHi = idx > prefix.length ? vis.slice(prefix.length) : "";

  return (
    <h1 className="mb-3 text-4xl font-semibold leading-tight md:text-5xl" style={{ color: theme.text }}>
      <span>{visPrefix}</span>
      <span style={{ color }}>{visHi}</span>
      {done && <span className="blink" style={{ color }}>.</span>}
    </h1>
  );
}
// 多语言支持已完成