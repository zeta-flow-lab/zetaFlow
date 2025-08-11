import React from "react";
import { Rocket, Command } from "lucide-react";

export interface Theme {
  bg: string;
  surface: string;
  line: string;
  text: string;
  subtext: string;
  accent: string;
  accentSoft: string;
  green: string;
  warning: string;
  danger: string;
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
      style={{ background: "rgba(255,255,255,0.06)", color }}
    >
      {label}
    </span>
  );
}

export default function TradeHeader({ theme, onOpenConnect }: { theme: Theme; onOpenConnect: () => void }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: theme.accent + "26" }}>
          <Rocket style={{ color: theme.green }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight" style={{ color: theme.text }}>ZetaFlow</span>
            <Tag label="Hackathon Preview" color={theme.subtext} />
          </div>
          <div className="text-xs" style={{ color: theme.subtext }}>Build Once, Launch Everywhere — with Gemini.</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="group flex items-center gap-1 rounded-xl px-3 py-2 text-sm"
          style={{ color: theme.text, background: "rgba(255,255,255,0.06)" }}
        >
          <Command size={16} className="opacity-80" />
          Cmd / K 打开命令面板
        </button>
        <button
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{ background: theme.accent, color: theme.text }}
          onClick={onOpenConnect}
        >
          <div className="flex items-center gap-1">连接钱包</div>
        </button>
      </div>
    </header>
  );
}
