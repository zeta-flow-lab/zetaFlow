import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TradeHeader from "./components/Header";
import TradeFooter from "./components/Footer";
import ChatList from "./components/Chat";
import {
  Sparkles, Wallet, ArrowLeftRight, Send, X, Loader2, Check, Copy,
  Bot, Shield, ChevronDown, ChevronRight, KeyRound
} from "lucide-react";

/**
 * ZetaFlow — AI 交易前端（单文件 Demo，按你的最新细节要求更新）
 * - 英雄标题：一句话，随时随地交易（绿色高亮）
 * - 英雄描述：删除原“面向 ZetaChain…”段，仅保留并改为“由 ZetaChain x Gemini 强力驱动”
 * - 链标签：仅显示链名，去掉 “· tag”
 * - 初始对话：改为“今天有什么能帮到您？”
 * - 输入占位：改成“示例：请你将我钱包中的 10 ZETA 按照当前市场价格换成 POL”
 * - Feature 文案：
 *   1) 原生跨链 → 原生资产；“跨链/资金统一” → “ZetaChain 通用能力”；描述改为“通用区块链让资产一次部署即可原生触达多链与比特币”
 *   2) 标签“自然语言 → 交易” → “Gemini 智慧能力”；描述改为“从自然语言直接分析交易意图并进行可靠执行”
 *   3) 标题“安全与可控” → “安全可控”；标签“合规/风控” → “ZetaFlow风控能力”；描述改为“可扩展的预检与风控规则为资产安全保驾护航”
 * - 其他保持不变
 */

// —— 设计令牌（主题配色）——
const theme = {
  bg: "#0B0B0E",                 // 背景
  surface: "rgba(255,255,255,0.06)", // 玻璃卡片
  line: "rgba(255,255,255,0.12)",
  text: "#EDEDED",               // 主文字（浅）
  subtext: "#B8BDC7",            // 次文字
  accent: "#025b45",             // 主强调（深绿）
  accentSoft: "#0F8F73",         // 深绿的柔和浅色，作为次强调
  green: "#b0ff61",              // 辅助强调（亮绿）
  warning: "#0F8F73",            // 温和提示（统一绿系）
  danger: "#FF5C7C",
};

// —— 链清单（按你给的图片）——
const CHAINS = [
  { id: "zetachain", name: "ZetaChain", color: theme.accent,     tag: "Universal EVM" },
  { id: "bsc",       name: "BSC",       color: theme.accentSoft, tag: "Mainnet" },
  { id: "ethereum",  name: "Ethereum",  color: theme.accentSoft, tag: "Mainnet" },
  { id: "polygon",   name: "Polygon",   color: theme.accentSoft, tag: "PoS" },
  { id: "bitcoin",   name: "Bitcoin",   color: theme.green,      tag: "L1" },
  { id: "base",      name: "Base",      color: theme.accentSoft, tag: "L2" },
  { id: "solana",    name: "Solana",    color: theme.green,      tag: "L1" },
  { id: "arbitrum",  name: "Arbitrum",  color: theme.accentSoft, tag: "L2" },
  { id: "avalanche", name: "Avalanche", color: theme.accentSoft, tag: "L1" },
  { id: "sui",       name: "Sui",       color: theme.accentSoft, tag: "L1" },
  { id: "ton",       name: "TON",       color: theme.accentSoft, tag: "L1" },
];

const TOKENS = [
  { symbol: "ZETA", name: "Zeta Token", chain: "zetachain" },
  { symbol: "ETH",  name: "Ether",      chain: "ethereum" },
  { symbol: "BTC",  name: "Bitcoin",    chain: "bitcoin" },
  { symbol: "USDC", name: "USD Coin",   chain: "ethereum" },
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
  const remove = (id: number) => setToasts((s) => s.filter((x) => x.id !== id));
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
        {/* 背景虚化 + 遮罩 */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        />
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

/* 缺一个英文版 */ 
// —— 主页面 —— 
export default function ZetaFlow() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "今天有什么能帮到您？" },
  ]);
  const [busy, setBusy] = useState(false);

  const [swapOpen, setSwapOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);   // 保留：自然语言“创建钱包”仍触发此模态
  const [connectOpen, setConnectOpen] = useState(false); // 新增：右上角“连接钱包”
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
        setMessages((m) => [...m, { role: "assistant", text: `将为你在 ${action.network || "ZetaChain"} 上创建智能账户（演示）。` }]);
        setCreateOpen(true);
        push({ icon: <Shield size={16} />, text: "创建钱包仅为前端演示，未发起真实链上事务。" });
        break;
      }
      case "swap": {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `准备将 ${action.amount ?? "?"} ${action.from} 兑换为 ${action.to}（${action.srcChain || "源链?"} → ${action.dstChain || "目标链?"}）。` },
        ]);
        setSwapOpen(true);
        push({ icon: <ArrowLeftRight size={16} />, text: "跨链兑换为演示 UI；接入后端/合约即可落地。" });
        break;
      }
      case "balance": {
        setMessages((m) => [...m, { role: "assistant", text: `正在查询 ${action.chain || "ZetaChain"} 上 ${action.token || "所有"} 余额（演示）。` }]);
        break;
      }
      default: {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "我没完全听懂。你可以试试：创建钱包｜查询余额｜swap 1 ETH to BTC on Bitcoin" },
        ]);
      }
    }
    setBusy(false);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    push({ icon: <Copy size={16} />, text: "已复制到剪贴板" });
  }

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: theme.bg }}>
      <BackgroundOrbs />

      {/* 顶栏 */}
      <TradeHeader theme={theme} onOpenConnect={() => setConnectOpen(true)} />

      {/* 英雄区 */}
      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-28 pt-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.h1
            className="mb-3 text-4xl font-semibold leading-tight md:text-5xl"
            style={{ color: theme.text }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            一句话，<span style={{ color: theme.green }}>随时随地交易</span>
          </motion.h1>

          {/* 删除原“面向 ZetaChain … 原生比特币。”这段，只保留下一行并加空格排版 */}
          <p className="max-w-2xl text-balance text-base" style={{ color: theme.subtext }}>
            由 ZetaChain x Gemini 强力驱动
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {CHAINS.map((c) => (<Pill key={c.id} text={c.name} color={c.color} />))}
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
                <div className="text-sm font-medium" style={{ color: theme.text }}>ZetaFlow Copilot</div>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: theme.subtext }}>
                <Shield size={14} /> Gemini 2.5
              </div>
            </div>

            <div className="mb-4 h-[38vh] max-h-[420px] overflow-y-auto pr-1">
              <ChatList messages={messages} theme={theme} />
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
                  placeholder="示例：请你将我钱包中的 10 ZETA 按照当前市场价格换成 POL"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
                  style={{ color: theme.text }}
                />
                <button
                  onClick={handleSend}
                  className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60"
                  disabled={busy}
                  style={{ background: theme.accent, color: theme.text }}
                >
                  <Send size={16} className={busy ? "animate-pulse" : ""} /> 发送
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
                    <span>解析为：</span>
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
          <FeatureCard
            icon={<ArrowLeftRight />}
            title="原生资产"
            desc="通用区块链让资产一次部署即可原生触达多链与比特币"
            tag="ZetaChain 通用能力"
          />
          <FeatureCard
            icon={<Bot />}
            title="AI 代理"
            desc="从自然语言直接分析交易意图并进行可靠执行"
            tag="Gemini 智慧能力"
          />
          <FeatureCard
            icon={<Shield />}
            title="安全可控"
            desc="可扩展的预检与风控规则为资产安全保驾护航"
            tag="ZetaFlow风控能力"
          />
        </div>
      </main>

      <TradeFooter theme={theme} />

      {/* 模态：连接钱包（新） */}
      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title="连接钱包">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ConnectOption
              icon={<Wallet />}
              title="连接 MetaMask"
              desc="浏览器扩展或移动端"
              onClick={() => { /* TODO: 注入你的连接逻辑 */ setConnectOpen(false); }}
            />
            <ConnectOption
              icon={<KeyRound />}
              title="使用行动密钥"
              desc="Action Key / Passkey 登录"
              onClick={() => { /* TODO: 行动密钥流程 */ setConnectOpen(false); }}
              /* 行动密钥后面这个可能要去掉，只保留mm登陆 */ 
            />
          </div>
          <div className="rounded-xl border p-3 text-xs" style={{ borderColor: theme.line, color: theme.subtext }}>
            我们不会保存你的私钥。连接后可在提交交易前看到<span style={{ color: theme.text }}>人类可读摘要</span>与<span style={{ color: theme.text }}>模拟结果</span>。
          </div>
          <div className="flex items-center justify-end">
            <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }} onClick={() => setConnectOpen(false)}>
              关闭
            </button>
          </div>
        </div>
      </Modal>

      {/* 模态：创建钱包（保留，供“创建钱包”自然语言指令使用） */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="创建智能账户（演示）">
        <div className="space-y-4">
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: theme.line, color: theme.subtext }}>
            创建时将展示 <span style={{ color: theme.text }}>人类可读签名</span> 与 <span style={{ color: theme.text }}>风险检查</span>。示例地址：
            <div className="mt-2 flex items-center justify-between rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <span className="font-mono" style={{ color: theme.text }}>zeta1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</span>
              <button onClick={() => copy("zeta1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")} className="opacity-80 hover:opacity-100">
                <Copy size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }} onClick={() => setCreateOpen(false)}>
              取消
            </button>
            <button className="rounded-xl px-3 py-2 text-sm font-medium" style={{ background: theme.accent, color: theme.text }} onClick={() => setCreateOpen(false)}>
              确认创建
            </button>
          </div>
        </div>
      </Modal>

      {/* 模态：Swap（原样保留，仅颜色已协调） */}
      <Modal open={swapOpen} onClose={() => setSwapOpen(false)} title="跨链兑换（演示）">
        <SwapForm onClose={() => setSwapOpen(false)} />
      </Modal>

      <Toasts list={toasts} onClose={remove} />
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

function SwapForm({ onClose }: { onClose: () => void }) {
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
        <Field label="源链">
          <select value={src} onChange={(e) => setSrc(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2"
                  style={{ borderColor: theme.line, color: theme.text }}>
            {CHAINS.map((c) => (<option key={c.id} value={c.id} style={{ background: theme.bg }}>{c.name}</option>))}
          </select>
        </Field>
        <Field label="目标链">
          <select value={dst} onChange={(e) => setDst(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2"
                  style={{ borderColor: theme.line, color: theme.text }}>
            {CHAINS.map((c) => (<option key={c.id} value={c.id} style={{ background: theme.bg }}>{c.name}</option>))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="支付">
          <div className="flex items-center gap-2">
            <select value={fromToken} onChange={(e) => setFromToken(e.target.value)} className="rounded-xl border bg-transparent px-3 py-2"
                    style={{ borderColor: theme.line, color: theme.text }}>
              {TOKENS.map((t) => (<option key={t.symbol} value={t.symbol} style={{ background: theme.bg }}>{t.symbol}</option>))}
            </select>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 rounded-xl border bg-transparent px-3 py-2"
                   style={{ borderColor: theme.line, color: theme.text }} />
          </div>
        </Field>
        <Field label="获得">
          <div className="flex items-center gap-2">
            <select value={toToken} onChange={(e) => setToToken(e.target.value)} className="rounded-xl border bg-transparent px-3 py-2"
                    style={{ borderColor: theme.line, color: theme.text }}>
              {TOKENS.map((t) => (<option key={t.symbol} value={t.symbol} style={{ background: theme.bg }}>{t.symbol}</option>))}
            </select>
            <div className="flex-1 rounded-xl border px-3 py-2 text-sm opacity-80" style={{ borderColor: theme.line, color: theme.text }}>估算输出</div>
          </div>
        </Field>
      </div>

      <div className="rounded-xl border p-3 text-xs" style={{ borderColor: theme.line, color: theme.subtext }}>
        提交前会展示 <span style={{ color: theme.text }}>交易路径/费率/滑点/模拟结果</span> 与 <span style={{ color: theme.text }}>人类可读摘要</span>（演示占位）。
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }} onClick={onClose}>
          取消
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60"
          disabled={!canSubmit || submitting}
          style={{ background: theme.accent, color: theme.text }}
          onClick={submit}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />} 确认兑换（演示）
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
      {/* 渐变光斑 1：主深绿 */}
      <motion.div
        className="absolute left-[-10%] top-[-10%] h-[480px] w-[480px] rounded-full blur-3xl"
        initial={{ opacity: 0.35, x: -40, y: -20 }}
        animate={{ opacity: 0.5, x: [-40, 10, -30], y: [-20, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        style={{ background: `radial-gradient(35% 35% at 50% 50%, ${theme.accent}66, transparent 70%)` }}
      />
      {/* 渐变光斑 2：柔深绿 */}
      <motion.div
        className="absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full blur-3xl"
        initial={{ opacity: 0.25, x: 20, y: 0 }}
        animate={{ opacity: 0.35, x: [20, -15, 10], y: [0, 20, -10] }}
        transition={{ duration: 14, repeat: Infinity, repeatType: "mirror" }}
        style={{ background: `radial-gradient(35% 35% at 50% 50%, ${theme.accentSoft}55, transparent 70%)` }}
      />
      {/* 渐变光斑 3：亮绿 */}
      <motion.div
        className="absolute bottom-[-20%] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        initial={{ opacity: 0.15, y: 20 }}
        animate={{ opacity: 0.22, y: [20, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, repeatType: "mirror" }}
        style={{ background: `radial-gradient(35% 35% at 50% 50%, ${theme.green}55, transparent 70%)` }}
      />
      {/* 细腻噪点 */}
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
