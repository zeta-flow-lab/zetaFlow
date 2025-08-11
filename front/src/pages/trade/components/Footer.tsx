import React from "react";
import type { Theme } from "./Header";

export default function TradeFooter({ theme }: { theme: Theme }) {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14 text-xs" style={{ color: theme.subtext }}>
      <div className="opacity-80">ZetaFlow © 2025 · Demo UI · Inspired by ZetaChain brand ethos</div>
    </footer>
  );
}
