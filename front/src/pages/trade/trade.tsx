import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ArrowLeftRight, X, Loader2, Copy,
  ChevronRight, KeyRound, PieChart
} from "lucide-react";
import { usePublicClient, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { parseAbi, parseUnits, stringToHex } from "viem";
import { depositPlanWithNative, depositPlanWithERC20, waitForReceipt } from "../../lib/gateway";
import { watchGatewayDeposits, watchGatewayWithdrawals, watchUniversalApp } from "../../lib/watchers";
import { getChainConfig } from "../../config/chains";
import { getUniversalAppAddress, getTokenAddress, isNativeToken, ERC20_ABI_FRAGMENTS } from "../../config/addresses";

import { I18N, type Lang } from "./utils/languageUtils";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Chat from "./components/Chat";
import { validatePlan, type ExecutablePlan } from "../../lib/plan-generator";
/**
* ZetaFlow — 多语言 + 动效版
* 本次更新：
* 1) 英雄标题（英文）加入打字机动画；结束后高亮色"."持续闪烁
* 2) 链标签增加左→右的平行动画轮播（优雅、可无障碍降级）
* 3) 语言切换修复：提升层级到 z-[70]，纯色背景避免"重影"，确保在英雄标题之上
* 4) "Cmd/K 打开命令面板"改为"打开命令面板"，点击即弹出命令面板
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

// —— 通用 UI ——
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border backdrop-blur-xl ${className}`} style={{ borderColor: theme.line, background: theme.surface }}>
      {children}
    </div>
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

  const [swapOpen, setSwapOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<ExecutablePlan | null>(null);

  const { toasts, push, remove } = useToasts();
  const publicClient = usePublicClient();
  const athensClient = usePublicClient({ chainId: 7001 } as any);
  const chainId = useChainId();

  // 网关事件监听（连接链）
  useEffect(() => {
    if (!publicClient || !chainId) return;
    const unwatchDeposit = watchGatewayDeposits(publicClient, chainId, (ev) => {
      push({ icon: <ArrowLeftRight size={16} />, text: `Gateway 入站: ${String(ev.args?.amount || '')}` });
    });
    const unwatchWithdraw = watchGatewayWithdrawals(publicClient, chainId, (ev) => {
      push({ icon: <ArrowLeftRight size={16} />, text: `Gateway 出站: ${String(ev.args?.amount || '')}` });
    });
    return () => { unwatchDeposit(); unwatchWithdraw(); };
  }, [publicClient, chainId]);

  // Universal App 事件监听（固定在 Athens 7001）
  useEffect(() => {
    if (!athensClient) return;
    const app = getUniversalAppAddress(7001);
    if (!app || /^0x0{40}$/i.test(app)) return;
    const unwatch = watchUniversalApp(athensClient, app as any, {
      onPlanSubmitted: () => push({ icon: <PieChart size={16} />, text: '计划已接收（onCall）' }),
      onStepExecuted: () => push({ icon: <ArrowLeftRight size={16} />, text: '出站步骤已执行' }),
      onPlanCompleted: () => push({ icon: <ArrowLeftRight size={16} />, text: '计划完成' }),
      onPlanFailed: () => push({ icon: <ArrowLeftRight size={16} />, text: '计划失败' }),
      onPlanReverted: () => push({ icon: <ArrowLeftRight size={16} />, text: '回滚完成（onRevert）' }),
    });
    return () => unwatch();
  }, [athensClient]);

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    push({ icon: <Copy size={16} />, text: STR.toasts.copied });
  }

  function handleRebalance(plan: ExecutablePlan) {
    setCurrentPlan(plan);
    setRebalanceOpen(true);
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

      {/* 使用 Header 组件 */}
      <Header
        lang={lang}
        setLang={setLang}
        onConnectWallet={() => setConnectOpen(true)}
        i18n={I18N}
      />

      {/* 英雄区 */}
      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-25">
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

        {/* 使用 Chat 组件 */}
        <Chat
          i18n={I18N}
          lang={lang}
          onCreateWallet={() => setCreateOpen(true)}
          onSwap={() => setSwapOpen(true)}
          onRebalance={handleRebalance}
          onShowToast={(text, icon) => push({ icon: icon || <ArrowLeftRight size={16} />, text })}
        />
      </main>

      <Footer i18n={I18N} lang={lang} />

      {/* Toasts */}
      <Toasts list={toasts} onClose={remove} />

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

      {/* 模态：资产配置计划 */}
      <Modal open={rebalanceOpen} onClose={() => setRebalanceOpen(false)} title="资产配置执行计划">
        {currentPlan && (
          <RebalancePlanModal
            plan={currentPlan}
            onClose={() => setRebalanceOpen(false)}
            onExecute={() => {
              push({ icon: <PieChart size={16} />, text: "执行计划（演示模式）" });
              setRebalanceOpen(false);
            }}
          />
        )}
      </Modal>

      {/* 模态：Swap（演示） */}
      <Modal open={swapOpen} onClose={() => setSwapOpen(false)} title={STR.swapModal.title}>
        <SwapForm onClose={() => setSwapOpen(false)} STR={STR} />
      </Modal>
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

function RebalancePlanModal({ plan, onClose, onExecute }: {
  plan: ExecutablePlan;
  onClose: () => void;
  onExecute?: () => void;
}) {
  const validation = validatePlan(plan);
  const publicClient = usePublicClient();
  const sepoliaClient = usePublicClient({ chainId: 11155111 } as any);
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const [submitting, setSubmitting] = React.useState(false);
  const [txHash, setTxHash] = React.useState<string | null>(null);
  const [execError, setExecError] = React.useState<string | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);

  async function handleExecute() {
    if (!validation.isValid) return;
    if (!publicClient || !walletClient) {
      setExecError("钱包未连接或网络不可用");
      return;
    }
    try {
      setSubmitting(true);
      setExecError(null);

      // 目标通用合约始终在 ZetaChain Athens（7001）
      const universalApp = getUniversalAppAddress(7001);
      if (!universalApp || /^0x0{40}$/i.test(universalApp)) {
        throw new Error("未配置 Universal App 地址，请先部署并在配置中更新");
      }

      const budget = plan.intent.budget;
      if (!budget) throw new Error("计划中缺少预算信息");
      const symbol = (budget.symbol || "").toUpperCase();

      // 选择入站源链：目前默认使用 Sepolia（11155111）
      const sourceChainId = 11155111;
      if (walletClient.chain?.id !== sourceChainId) {
        try {
          await switchChain({ chainId: sourceChainId });
        } catch (err) {
          throw new Error(`请先将钱包网络切换到 Sepolia (id: ${sourceChainId}) 再执行计划。当前: ${walletClient.chain?.id}`);
        }
      }

      // 构造 RevertOptions（默认回退到 UniversalApp，并调用 onRevert）
      const revertOptions = {
        revertAddress: universalApp as any,
        callOnRevert: true,
        abortAddress: universalApp as any,
        revertMessage: stringToHex('ZetaFlow revert', { size: 32 }) as any,
        onRevertGasLimit: BigInt(300000),
      } as const;

      let hash: `0x${string}`;
      if (isNativeToken(sourceChainId, symbol)) {
        const amountWei = parseUnits(String(budget.amount), 18);
        const res = await depositPlanWithNative(publicClient, walletClient, sourceChainId, universalApp as any, amountWei, plan, revertOptions as any);
        hash = res.hash as `0x${string}`;
      } else {
        // ERC-20 资产：从源链（Sepolia）查找 ERC-20 地址
        const token = getTokenAddress(sourceChainId, symbol);
        if (!token) throw new Error(`未配置 ${symbol} 在当前网络的代币地址`);
        const erc20Abi = parseAbi(ERC20_ABI_FRAGMENTS as readonly string[]);
        const decimals = (await publicClient.readContract({
          abi: erc20Abi,
          address: token as any,
          functionName: "decimals",
        })) as number;
        const amount = parseUnits(String(budget.amount), decimals);
        const res = await depositPlanWithERC20(publicClient, walletClient, sourceChainId, token as any, universalApp as any, amount, plan, revertOptions as any);
        hash = res.hash as `0x${string}`;
      }

      setTxHash(hash);
      const clientToUse = (publicClient as any)?.chain?.id === sourceChainId ? publicClient : (sepoliaClient || publicClient);
      const receipt = await waitForReceipt(clientToUse as any, hash as any);
      // viem 在不同链/客户端返回的 status 可能是 'success' | 'reverted' 或 1/0
      const ok = (receipt as any)?.status === 'success' || (receipt as any)?.status === 1 || (receipt as any)?.status === '0x1';
      if (ok) {
        setConfirmed(true);
      }
      onExecute?.();
    } catch (e: any) {
      setExecError(e?.message || "执行失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 计划摘要 */}
      <div className="rounded-xl border p-4" style={{ borderColor: theme.line, background: "rgba(255,255,255,0.02)" }}>
        <div className="mb-3 flex items-center gap-2">
          <PieChart size={18} style={{ color: theme.green }} />
          <h4 className="font-semibold" style={{ color: theme.text }}>配置目标</h4>
        </div>
        <div className="space-y-2">
          {plan.intent.targets.map((target, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span style={{ color: theme.subtext }}>
                {target.symbol || target.tag} {target.basket ? `(${target.basket.join(', ')})` : ''}
              </span>
              <span style={{ color: theme.text }} className="font-medium">
                {(target.weight * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 执行计划 */}
      <div className="rounded-xl border p-4" style={{ borderColor: theme.line, background: "rgba(255,255,255,0.02)" }}>
        <h4 className="mb-3 font-semibold" style={{ color: theme.text }}>执行步骤 ({plan.summary.totalSteps})</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {plan.steps.map((step, i) => (
            <div key={step.id} className="flex items-center justify-between text-sm">
              <div>
                <span style={{ color: theme.text }}>
                  {i + 1}. {step.fromToken} → {step.toToken}
                </span>
                <div style={{ color: theme.subtext }} className="text-xs">
                  {step.fromChain} → {step.toChain} · {step.estimatedTime}分钟
                </div>
              </div>
              <span style={{ color: theme.subtext }} className="text-xs">
                {step.estimatedFee} ETH
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 费用和风险摘要 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3" style={{ borderColor: theme.line }}>
          <div className="text-xs" style={{ color: theme.subtext }}>总费用</div>
          <div className="text-lg font-semibold" style={{ color: theme.text }}>
            {plan.summary.totalEstimatedFee} ETH
          </div>
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: theme.line }}>
          <div className="text-xs" style={{ color: theme.subtext }}>预计时间</div>
          <div className="text-lg font-semibold" style={{ color: theme.text }}>
            {plan.summary.totalEstimatedTime}分钟
          </div>
        </div>
      </div>

      {/* 风险评估 */}
      <div className="rounded-xl border p-3" style={{ borderColor: theme.line }}>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: theme.subtext }}>风险等级</span>
          <span className={`text-sm font-medium ${plan.summary.riskLevel === 'low' ? '' :
            plan.summary.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
            }`} style={{
              color: plan.summary.riskLevel === 'low' ? theme.green : undefined
            }}>
            {plan.summary.riskLevel === 'low' ? '低风险' :
              plan.summary.riskLevel === 'medium' ? '中风险' : '高风险'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: theme.subtext }}>成功概率</span>
          <span className="text-sm font-medium" style={{ color: theme.text }}>
            {(plan.summary.successProbability * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 验证错误 */}
      {!validation.isValid && (
        <div className="rounded-xl border p-3" style={{ borderColor: theme.danger, background: `${theme.danger}15` }}>
          <div className="text-sm font-medium" style={{ color: theme.danger }}>验证失败</div>
          <ul className="mt-1 text-xs space-y-1">
            {validation.errors.map((error, i) => (
              <li key={i} style={{ color: theme.danger }}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 交易信息 */}
      {(txHash || execError) && (
        <div className="rounded-xl border p-3" style={{ borderColor: theme.line }}>
          {txHash && (
            <div className="text-xs" style={{ color: theme.subtext }}>
              Tx Hash: <span className="font-mono" style={{ color: theme.text }}>{txHash}</span>
            </div>
          )}
          {execError && (
            <div className="text-xs" style={{ color: theme.danger }}>
              {execError}
            </div>
          )}
          {txHash && walletClient?.chain?.id && (
            <div className="mt-1 text-xs">
              {(() => {
                const cfg = getChainConfig(walletClient.chain!.id);
                const url = cfg?.blockExplorers?.default?.url;
                if (!url) return null;
                return (
                  <a href={`${url}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline" style={{ color: theme.text }}>
                    在区块浏览器查看
                  </a>
                );
              })()}
            </div>
          )}
          {confirmed && (
            <div className="mt-1 text-xs" style={{ color: theme.green }}>
              交易已确认
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: "rgba(255,255,255,0.06)", color: theme.text }}
          onClick={onClose}
        >
          取消
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
          disabled={!validation.isValid || submitting}
          style={{ background: validation.isValid ? theme.accent : theme.subtext, color: theme.text }}
          onClick={handleExecute}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <PieChart size={16} />}
          {submitting ? '提交中…' : (validation.isValid ? '执行计划' : '无法执行')}
        </button>
      </div>
    </div>
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