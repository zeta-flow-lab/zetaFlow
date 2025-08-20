import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Shield, KeyRound, Send, ChevronRight, PieChart } from "lucide-react";
import { sendChatMessage } from "../../../api/oneRouter";
import { parseIntent, type ParsedIntent, type RebalanceIntent } from "../../../lib/intent-parser";
import { generatePlan, validatePlan, formatPlanSummary, type ExecutablePlan } from "../../../lib/plan-generator";

// Theme object - consider moving to a shared file later
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

// GlassCard component
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border backdrop-blur-xl ${className}`} style={{ borderColor: theme.line, background: theme.surface }}>
      {children}
    </div>
  );
}

// ChatList component
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

// Helper function to parse commands (extended)
type Action = {
  type: "create_wallet" | "swap" | "balance" | "rebalance" | "unknown";
  network?: string;
  amount?: number;
  from?: string;
  to?: string;
  token?: string;
  chain?: string;
  srcChain?: string;
  dstChain?: string;
  intent?: RebalanceIntent;
  plan?: ExecutablePlan;
};

function parseCommand(input: string): Action {
  const normalizedInput = input.toLowerCase();

  // 使用新的意图解析器
  const parsedIntent = parseIntent(input);

  if (parsedIntent.type === "rebalance") {
    return {
      type: "rebalance",
      intent: parsedIntent as RebalanceIntent
    };
  }

  // 保留原有的解析逻辑作为后备
  if (/创建|create|wallet/.test(normalizedInput)) {
    const network = normalizedInput.match(/(在|on)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    return { type: "create_wallet", network };
  }

  if (/余额|balance/.test(normalizedInput)) {
    const token = (normalizedInput.match(/(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const chain = normalizedInput.match(/(在|on)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    return { type: "balance", token, chain };
  }

  if (/swap|兑换|兌換|换/.test(normalizedInput)) {
    const amt = Number(normalizedInput.match(/(\d+\.?\d*)\s*(zeta|eth|btc|usdc)/)?.[1]);
    const from = (normalizedInput.match(/\d+\.?\d*\s*(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const to = (normalizedInput.match(/to\s*(zeta|eth|btc|usdc)/)?.[1] || normalizedInput.match(/成\s*(zeta|eth|btc|usdc)/)?.[1] || "").toUpperCase();
    const srcChain = normalizedInput.match(/(在|on)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    const dstChain = normalizedInput.match(/(到|to)\s*(zetachain|ethereum|bitcoin|solana)/)?.[2];
    if (from && to) return { type: "swap", from, to, amount: isNaN(amt) ? undefined : amt, srcChain, dstChain };
  }
  return { type: "unknown" };
}

// Sleep function for simulating API calls
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ChatProps {
  i18n: any;
  lang: string;
  onCreateWallet: () => void;
  onSwap: () => void;
  onRebalance: (plan: ExecutablePlan) => void;
  onShowToast: (text: string, icon?: React.ReactNode) => void;
}

export default function Chat({ i18n, lang, onCreateWallet, onSwap, onRebalance, onShowToast }: ChatProps) {
  const STR = i18n[lang];

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: i18n.en.chat.initial }, // Default to English initially
  ]);
  const [busy, setBusy] = useState(false);
  const [commandPreview, setCommandPreview] = useState<Action | null>(null);
  const [useAI, setUseAI] = useState(true); // Set AI mode to be active by default

  useEffect(() => {
    setCommandPreview(input ? parseCommand(input) : null);
  }, [input]);

  async function handleSend() {
    if (!input.trim()) return;
    const userMessage = input;
    const action = parseCommand(input);

    // Add user message to chat
    setMessages((m) => [...m, { role: "user", text: userMessage }]);
    setInput("");
    setBusy(true);

    try {
      // Check if we should use AI or command parsing
      if (useAI) {
        // Use OneRouter API for AI responses
        // Add explicit type assertion to ensure type safety
        const currentMessages = [...messages, { role: "user" as const, text: userMessage }];
        const aiResponse = await sendChatMessage(currentMessages);

        setMessages((m) => [...m, { role: "assistant", text: aiResponse }]);
      } else {
        // Use command parsing (existing functionality)
        await sleep(480);

        switch (action.type) {
          case "create_wallet": {
            setMessages((m) => [...m, { role: "assistant", text: STR.msgs.create(action.network || "ZetaChain") }]);
            onCreateWallet();
            onShowToast(STR.toasts.createDemo);
            break;
          }
          case "swap": {
            setMessages((m) => [
              ...m,
              { role: "assistant", text: STR.msgs.swap(action.amount, action.from, action.to, action.srcChain, action.dstChain) },
            ]);
            onSwap();
            onShowToast(STR.toasts.swapDemo);
            break;
          }
          case "balance": {
            setMessages((m) => [...m, { role: "assistant", text: STR.msgs.balance(action.token, action.chain) }]);
            break;
          }
          case "rebalance": {
            if (action.intent) {
              setMessages((m) => [...m, { role: "assistant", text: "正在为您生成资产配置计划，请稍候..." }]);

              try {
                const plan = await generatePlan(action.intent);
                const validation = validatePlan(plan);

                if (validation.isValid) {
                  const summary = formatPlanSummary(plan);
                  setMessages((m) => [...m, { role: "assistant", text: summary }]);
                  onRebalance(plan);
                  onShowToast("资产配置计划已生成", <PieChart size={16} />);
                } else {
                  setMessages((m) => [...m, {
                    role: "assistant",
                    text: `计划验证失败：\n${validation.errors.join('\n')}`
                  }]);
                  onShowToast("计划验证失败，请检查输入");
                }
              } catch (error) {
                console.error("生成计划失败:", error);
                setMessages((m) => [...m, {
                  role: "assistant",
                  text: "抱歉，生成计划时遇到错误，请重试。"
                }]);
                onShowToast("生成计划失败");
              }
            }
            break;
          }
          default: {
            setMessages((m) => [...m, { role: "assistant", text: STR.msgs.fallback }]);
          }
        }
      }
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard className="mx-auto w-full max-w-4xl p-2 md:p-3">
      <div className="relative rounded-2xl border p-3 md:p-6" style={{ borderColor: theme.line }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
              <Bot size={18} />
            </div>
            <div className="text-sm font-medium" style={{ color: theme.text }}>{STR.chat.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseAI(!useAI)}
              className="rounded-lg px-2 py-1 text-xs"
              style={{
                background: useAI ? theme.accent : "rgba(255,255,255,0.06)",
                color: theme.text
              }}
            >
              {useAI ? "AI Mode" : "Command Mode"}
            </button>
            <div className="text-xs" style={{ color: theme.subtext }}>
              <Shield size={14} /> {STR.chat.badge}
            </div>
          </div>
        </div>

        <div className="mb-4 h-[38vh] max-h-[420px] overflow-y-auto pr-1">
          <ChatList messages={messages} />
        </div>

        {/* Input area */}
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

          {/* Command preview */}
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
  );
}