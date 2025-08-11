import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Theme } from "./Header";

export interface ChatMessage { role: "user" | "assistant"; text: string }

export default function ChatList({ messages, theme }: { messages: ChatMessage[]; theme: Theme }) {
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
