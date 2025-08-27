import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ArrowLeftRight, X, Loader2, Check, Copy,
  Rocket, ChevronRight, KeyRound, PieChart, Activity
} from "lucide-react";
import { TransactionMonitor } from "../../components/TransactionMonitor";
import { usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { parseUnits, parseAbi, encodeAbiParameters } from 'viem';

import { I18N, type Lang } from "./utils/languageUtils";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Chat from "./components/Chat";
import { getUniversalAppAddress, getTokenAddress, ERC20_ABI_FRAGMENTS } from "../../config/addresses";
import { watchUniversalApp, watchGatewayWithdrawals } from "../../lib/watchers";
import { sendMessage } from "../../lib/universalApp";
import { depositPlanWithNative, depositPlanWithERC20, waitForReceipt, type RevertOptions } from "../../lib/gateway";
import type { ExecutablePlan } from "../../lib/plan-generator";
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
  const [msgOpen, setMsgOpen] = useState(false);

  // 资产配置相关状态
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<ExecutablePlan | null>(null);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string>('');

  const { toasts, push, remove } = useToasts();

  // Wagmi hooks
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  // const chainId = useChainId(); // 暂时未使用
  const { switchChain } = useSwitchChain();

  // Athens 专用客户端
  const athensClient = usePublicClient({ chainId: 7001 } as any);

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    push({ icon: <Copy size={16} />, text: STR.toasts.copied });
  }

  // 处理资产配置计划
  function handleRebalance(plan: ExecutablePlan) {
    setCurrentPlan(plan);
    setRebalanceOpen(true);
  }

  // Universal App 事件监听（简化版本 - 仅监听结果）
  useEffect(() => {
    if (!athensClient) return;
    const app = getUniversalAppAddress(7001);
    if (!app || /^0x0{40}$/i.test(app)) return;

    console.log('🔄 开始监听 Universal App 事件...', { app, athensClient: !!athensClient });

    const unwatchUniversal = watchUniversalApp(athensClient, app as any, {
      onPlanSubmitted: async (log) => {
        const planId = log.args.planId;
        const submitter = log.args.submitter;
        const planDataHash = log.args.planDataHash;

        console.log('📊 PlanSubmitted 事件:', {
          planId,
          submitter,
          planDataHash,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });

        push({ icon: <PieChart size={16} />, text: `📊 计划已接收 (ID: ${planId?.slice(0, 8)}...)` });

        // 仅确认计划提交，合约将自动处理所有 swap 和 withdraw
        if (currentPlan && walletClient?.account?.address === submitter) {
          push({ icon: <ArrowLeftRight size={16} />, text: '🔄 合约正在自动执行资产配置...' });
          console.log('✅ 确认为当前用户的计划，开始自动执行');
        } else {
          console.log('ℹ️ 不是当前用户的计划或无活跃计划');
        }
      },
      onStepExecuted: (log) => {
        const { planId, stepIndex, token, amount, dstChainId, receiver } = log.args;

        console.log('🔄 StepExecuted 事件:', {
          planId: planId?.slice(0, 8) + '...',
          stepIndex: stepIndex?.toString(),
          token,
          amount: amount?.toString(),
          dstChainId: dstChainId?.toString(),
          receiver,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });

        push({
          icon: <ArrowLeftRight size={16} />,
          text: `✅ 步骤 ${stepIndex}/${currentPlan?.summary.totalSteps || '?'} 已完成 - ${amount?.toString()} 代币已发送`
        });
      },
      onPlanCompleted: (log) => {
        const { planId, steps } = log.args;

        console.log('🎉 PlanCompleted 事件:', {
          planId: planId?.slice(0, 8) + '...',
          totalSteps: steps?.toString(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });

        push({ icon: <Check size={16} />, text: `🎉 资产配置完成！共执行 ${steps} 个步骤，资金已分配到目标链` });

        // 重置当前计划
        setCurrentPlan(null);
        setRebalanceOpen(false);
      },
      onPlanFailed: (log) => {
        const { planId, reason } = log.args;

        console.log('❌ PlanFailed 事件:', {
          planId: planId?.slice(0, 8) + '...',
          reason,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });

        push({ icon: <X size={16} />, text: `❌ 配置失败: ${reason || '未知错误'}` });
        setCurrentPlan(null);
        setRebalanceOpen(false);
      },
      onPlanReverted: (log) => {
        const { asset, amount, revertMessage } = log.args;

        console.log('🔄 PlanReverted 事件:', {
          asset,
          amount: amount?.toString(),
          revertMessage,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        });

        push({ icon: <ArrowLeftRight size={16} />, text: `🔄 交易已回滚，${amount} 资产已退还` });
        setCurrentPlan(null);
        setRebalanceOpen(false);
      },
      onMessageSent: (log) => {
        const { receiver, gasZRC20, gasLimit, data } = log.args || {} as any;
        console.log('✉️ MessageSent 事件:', { receiver, gasZRC20, gasLimit: gasLimit?.toString(), data, tx: log.transactionHash });
        push({ icon: <ArrowLeftRight size={16} />, text: `✉️ 消息已发送，gasLimit=${gasLimit?.toString()}` });
      },
      onMessageReverted: (log) => {
        const { revertMessage } = log.args || {} as any;
        console.log('↩️ MessageReverted 事件:', { revertMessage, tx: log.transactionHash });
        push({ icon: <X size={16} />, text: `↩️ 消息回滚：${revertMessage ? String(revertMessage) : 'unknown'}` });
      }
    });

    // 监听 ZEVM Gateway 的 Withdrawn 事件（出站提现）
    const unwatchWithdrawn = watchGatewayWithdrawals(athensClient as any, 7001, (ev) => {
      const { token, receiver, amount } = ev.args || ({} as any);
      if (amount) {
        const tokenShort = token ? String(token).slice(0, 8) + '…' : 'ZRC20';
        const recvShort = receiver ? String(receiver).slice(0, 10) + '…' : 'receiver';
        push({ icon: <ArrowLeftRight size={16} />, text: `ZEVM 提现: ${amount?.toString()} ${tokenShort} -> ${recvShort}` });
      }
      console.log('📤 Gateway Withdrawn:', { token, receiver, amount, ev });
    });

    return () => { unwatchUniversal(); unwatchWithdrawn(); };
  }, [athensClient, currentPlan, walletClient, push]);

  // ✅ 不再需要手动执行函数 - 合约将自动处理所有配置逻辑



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
        <div className="mt-4 flex justify-end">
          <button
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "rgba(255,255,255,0.06)", color: theme.text }}
            onClick={() => setMsgOpen(true)}
          >
            发送跨链消息（演示）
          </button>
        </div>
      </main>

      <Footer i18n={I18N} lang={lang} />

      {/* Toasts */}
      <Toasts list={toasts} onClose={remove} />

      {/* 模态：连接钱包 */}
      {/* 模态：发送消息（演示） */}
      <Modal open={msgOpen} onClose={() => setMsgOpen(false)} title="发送跨链消息（ZEVM → 连接链）">
        <MessageForm onClose={() => setMsgOpen(false)} STR={STR} publicClient={publicClient} walletClient={walletClient} onShowToast={(text, icon) => push({ icon: icon || <ArrowLeftRight size={16} />, text })} />
      </Modal>
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

      {/* 模态：资产配置计划确认 */}
      <Modal open={rebalanceOpen} onClose={() => setRebalanceOpen(false)} title="资产配置计划">
        {currentPlan && (
          <RebalancePlanModal
            plan={currentPlan}
            onExecute={() => {
              setRebalanceOpen(false);
              // 执行计划的逻辑已在 handleExecute 中实现
            }}
            onClose={() => setRebalanceOpen(false)}
            walletClient={walletClient}
            publicClient={publicClient}
            switchChain={switchChain}
            onShowToast={push}
            setCurrentTxHash={setCurrentTxHash}
            setMonitorOpen={setMonitorOpen}
          />
        )}
      </Modal>

      {/* 交易监控器 */}
      {monitorOpen && (
        <TransactionMonitor
          txHash={currentTxHash}
          planId={currentPlan?.id}
          onClose={() => {
            setMonitorOpen(false);
            setCurrentTxHash('');
          }}
        />
      )}
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

function MessageForm({ onClose, STR, publicClient, walletClient, onShowToast }: { onClose: () => void; STR: any; publicClient: any; walletClient: any; onShowToast: (text: string, icon?: React.ReactNode) => void }) {
  const [receiver, setReceiver] = useState<string>("0x");
  const [gasZRC20, setGasZRC20] = useState<string>("");
  const [gasLimit, setGasLimit] = useState<string>("300000");
  const [payload, setPayload] = useState<string>("hello");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = /^0x[0-9a-fA-F]{40}$/.test(receiver) && /^0x[0-9a-fA-F]{40}$/.test(gasZRC20) && Number(gasLimit) > 0;

  async function submit() {
    if (!canSubmit) return;
    if (!walletClient || !publicClient) {
      onShowToast('钱包未连接');
      return;
    }
    try {
      setSubmitting(true);
      const receiverBytes = (receiver as `0x${string}`) as any;
      const data = encodeAbiParameters([{ type: 'string' }], [payload]) as `0x${string}`;
      const hash = await sendMessage(publicClient, walletClient, receiverBytes, gasZRC20 as `0x${string}`, data, BigInt(gasLimit));
      onShowToast(`✉️ 消息交易提交：${hash.slice(0, 10)}...`);
      onClose();
    } catch (e: any) {
      console.error(e);
      onShowToast(`发送失败：${e?.message || 'unknown'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="目的链合约地址 (receiver)">
        <input value={receiver} onChange={(e) => setReceiver(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: theme.line, color: theme.text }} placeholder="0x..." />
      </Field>
      <Field label="目的链 gas ZRC-20">
        <input value={gasZRC20} onChange={(e) => setGasZRC20(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: theme.line, color: theme.text }} placeholder="0x05BA... (sETH.SEPOLIA)" />
      </Field>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="gasLimit">
          <input value={gasLimit} onChange={(e) => setGasLimit(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: theme.line, color: theme.text }} />
        </Field>
        <Field label="payload (string)">
          <input value={payload} onChange={(e) => setPayload(e.target.value)} className="w-full rounded-xl border bg-transparent px-3 py-2" style={{ borderColor: theme.line, color: theme.text }} />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.06)", color: theme.text }} onClick={onClose}>取消</button>
        <button className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60" disabled={!canSubmit || submitting} style={{ background: theme.accent, color: theme.text }} onClick={submit}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} {submitting ? '发送中...' : '发送消息'}
        </button>
      </div>
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

// 资产配置计划确认模态
function RebalancePlanModal({
  plan,
  onExecute,
  onClose,
  walletClient,
  publicClient,
  switchChain,
  onShowToast,
  setCurrentTxHash,
  setMonitorOpen
}: {
  plan: ExecutablePlan;
  onExecute: () => void;
  onClose: () => void;
  walletClient: any;
  publicClient: any;
  switchChain: any;
  onShowToast: (toast: { icon?: React.ReactNode; text: string }) => void;
  setCurrentTxHash: (hash: string) => void;
  setMonitorOpen: (open: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [execError, setExecError] = useState<string>('');

  async function handleExecute() {
    if (!walletClient || !publicClient) {
      setExecError('钱包未连接');
      return;
    }

    try {
      setSubmitting(true);
      setExecError('');

      console.log('🚀 开始执行资产配置计划:', {
        planId: plan.id,
        intent: plan.intent,
        wallet: walletClient.account?.address,
        currentChain: walletClient.chain?.id
      });

      const universalApp = getUniversalAppAddress(7001); // Universal App 在 Athens
      if (!universalApp) {
        throw new Error('未配置 Universal App 地址');
      }

      console.log('📍 Universal App 地址:', universalApp);

      // 解析预算
      const budget = plan.intent.budget;
      if (!budget) {
        throw new Error('未指定预算');
      }

      const { symbol, amount } = budget;
      const sourceChainId = 11155111; // Sepolia

      console.log('💰 预算信息:', { symbol, amount, sourceChainId });

      // 切换到 Sepolia 执行入站交易
      if (walletClient.chain?.id !== sourceChainId) {
        console.log('🔄 切换网络到 Sepolia...');
        try {
          await switchChain({ chainId: sourceChainId });
          console.log('✅ 网络切换成功');
        } catch (err) {
          console.error('❌ 网络切换失败:', err);
          throw new Error(`请先将钱包网络切换到 Sepolia (id: ${sourceChainId}) 再执行计划。当前: ${walletClient.chain?.id}`);
        }
      }

      // 构建 RevertOptions
      const revertOptions: RevertOptions = {
        revertAddress: walletClient.account?.address as `0x${string}`,
        callOnRevert: false,
        abortAddress: universalApp as `0x${string}`,
        revertMessage: '0x',
        onRevertGasLimit: BigInt(0),
      };

      // 判断是否为原生代币
      function isNativeToken(chainId: number, symbol: string): boolean {
        if (chainId === 11155111) return symbol.toUpperCase() === 'ETH';
        return false;
      }

      let hash: `0x${string}`;
      if (isNativeToken(sourceChainId, symbol)) {
        // 使用原生 ETH
        const nativeAmountWei = parseUnits(amount.toString(), 18);

        console.log('📤 准备发送入站交易:', {
          amount: amount.toString(),
          amountWei: nativeAmountWei.toString(),
          sourceChain: sourceChainId,
          targetApp: universalApp,
          callData: plan.callData?.slice(0, 100) + '...'
        });

        hash = await depositPlanWithNative(
          publicClient,
          walletClient,
          sourceChainId,
          universalApp as `0x${string}`,
          nativeAmountWei,
          plan,
          revertOptions
        ).then(result => {
          console.log('✅ 交易已提交:', result.hash);
          return result.hash;
        });
      } else {
        // 使用 ERC-20 代币
        const erc20 = getTokenAddress(sourceChainId, symbol);
        if (!erc20) {
          throw new Error(`未配置 ${symbol} 在链 ${sourceChainId} 的代币地址`);
        }

        const ERC20_ABI = parseAbi(ERC20_ABI_FRAGMENTS as readonly string[]);
        const decimals = await publicClient.readContract({
          abi: ERC20_ABI as any,
          address: erc20 as any,
          functionName: 'decimals',
        }) as number;
        const erc20Amount = parseUnits(amount.toString(), decimals);

        console.log('📤 准备发送入站 ERC-20 交易:', {
          token: erc20,
          symbol,
          amount,
          amountUnits: erc20Amount.toString(),
          sourceChain: sourceChainId,
          targetApp: universalApp,
        });

        hash = await depositPlanWithERC20(
          publicClient,
          walletClient,
          sourceChainId,
          erc20 as `0x${string}`,
          universalApp as `0x${string}`,
          erc20Amount,
          plan,
          revertOptions
        ).then(result => {
          console.log('✅ ERC-20 入站交易已提交:', result.hash);
          return result.hash;
        });
      }

      setTxHash(hash);
      onShowToast({ icon: <Check size={16} />, text: `入站交易已提交 (${hash.slice(0, 10)}...)` });
      console.log('📋 交易哈希:', hash);

      // 等待交易确认 - 增加重试和超时处理
      console.log('⏳ 等待交易确认...');
      const sepoliaClient = publicClient; // 假设已经在 Sepolia
      const clientToUse = (publicClient as any)?.chain?.id === sourceChainId ? publicClient : (sepoliaClient || publicClient);

      try {
        const receipt = await Promise.race([
          waitForReceipt(clientToUse as any, hash as any),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('交易确认超时 (3分钟)')), 180000)
          )
        ]) as any;

        console.log('📋 交易收据:', {
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString(),
          transactionHash: receipt.transactionHash
        });

        if (receipt.status === 'success') {
          onShowToast({ icon: <Check size={16} />, text: '✅ 入站交易已确认，等待合约处理...' });
          console.log('🎉 入站交易成功，等待 Universal App 处理...');
          // 打开监控器而不是立即关闭模态框
          setCurrentTxHash(hash);
          setMonitorOpen(true);
          onExecute?.();
        } else {
          throw new Error('交易失败');
        }
      } catch (timeoutError: any) {
        console.warn('⚠️ 交易确认超时，但可能仍在处理中:', timeoutError.message);
        onShowToast({ icon: <Activity size={16} />, text: '⚠️ 交易确认超时，开启监控模式' });
        // 即使超时也打开监控器，让用户跟踪进度
        setCurrentTxHash(hash);
        setMonitorOpen(true);
        onExecute?.();
      }

    } catch (e: any) {
      console.error('❌ 执行过程中出错:', e);
      console.error('错误详情:', {
        message: e?.message,
        stack: e?.stack,
        cause: e?.cause
      });
      setExecError(e?.message || "执行失败");
      onShowToast({ icon: <X size={16} />, text: `❌ 执行失败: ${e?.message || '未知错误'}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 配置目标 */}
      <div>
        <h4 className="mb-2 font-medium" style={{ color: theme.text }}>配置目标</h4>
        <div className="space-y-2">
          {plan.intent.targets.map((target, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: theme.line }}>
              <span style={{ color: theme.text }}>
                {target.symbol || target.tag} {target.basket ? `(${target.basket.join(', ')})` : ''}
              </span>
              <span className="font-medium" style={{ color: theme.green }}>
                {(target.weight * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 执行步骤 */}
      <div>
        <h4 className="mb-2 font-medium" style={{ color: theme.text }}>执行步骤 ({plan.steps.length})</h4>
        <div className="space-y-1">
          {plan.steps.slice(0, 3).map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color: theme.subtext }}>
              <span className="text-xs rounded px-1" style={{ background: theme.accent, color: theme.text }}>
                {i + 1}
              </span>
              {step.fromToken} → {step.toToken} ({step.fromChain} → {step.toChain})
            </div>
          ))}
          {plan.steps.length > 3 && (
            <div className="text-xs" style={{ color: theme.subtext }}>
              ... 还有 {plan.steps.length - 3} 个步骤
            </div>
          )}
        </div>
      </div>

      {/* 费用和风险摘要 */}
      <div className="rounded-lg border p-3" style={{ borderColor: theme.line, background: 'rgba(255,255,255,0.02)' }}>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div style={{ color: theme.subtext }}>预计费用</div>
            <div className="font-medium" style={{ color: theme.text }}>{plan.summary.totalEstimatedFee} ETH</div>
          </div>
          <div>
            <div style={{ color: theme.subtext }}>预计时间</div>
            <div className="font-medium" style={{ color: theme.text }}>{plan.summary.totalEstimatedTime} 分钟</div>
          </div>
          <div>
            <div style={{ color: theme.subtext }}>风险等级</div>
            <div className="font-medium" style={{
              color: plan.summary.riskLevel === 'low' ? theme.green :
                plan.summary.riskLevel === 'medium' ? theme.warning : theme.danger
            }}>
              {plan.summary.riskLevel === 'low' ? '低' : plan.summary.riskLevel === 'medium' ? '中' : '高'}
            </div>
          </div>
          <div>
            <div style={{ color: theme.subtext }}>成功概率</div>
            <div className="font-medium" style={{ color: theme.text }}>
              {(plan.summary.successProbability * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 错误显示 */}
      {execError && (
        <div className="rounded-lg border p-3" style={{ borderColor: theme.danger, background: 'rgba(255, 92, 124, 0.1)' }}>
          <div className="text-sm" style={{ color: theme.danger }}>{execError}</div>
        </div>
      )}

      {/* 交易哈希 */}
      {txHash && (
        <div className="rounded-lg border p-3" style={{ borderColor: theme.line }}>
          <div className="text-sm" style={{ color: theme.subtext }}>交易哈希</div>
          <div className="font-mono text-xs break-all" style={{ color: theme.text }}>{txHash}</div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: "rgba(255,255,255,0.06)", color: theme.text }}
          onClick={onClose}
          disabled={submitting}
        >
          取消
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
          disabled={submitting}
          style={{ background: theme.accent, color: theme.text }}
          onClick={handleExecute}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          {submitting ? '执行中...' : '执行计划'}
        </button>
      </div>
    </div>
  );
}

// 多语言支持已完成