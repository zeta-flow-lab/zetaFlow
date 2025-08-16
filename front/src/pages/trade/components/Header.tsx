import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Sparkles, Wallet, Check, Globe, ChevronDown } from "lucide-react";
import { useRef, useEffect } from "react";

// Import theme and language types from a shared file
// You might want to move these to a separate file later
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

type Lang = "en" | "zh" | "ko" | "ja";

const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  zh: "简体中文",
  ko: "한국어",
  ja: "日本語",
};

// Tag component for the header
function Tag({ label, color = theme.subtext }: { label: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
      style={{ background: "rgba(255,255,255,0.06)", color }}>
      <Sparkles size={14} /> {label}
    </span>
  );
}

// Language switcher component
function LanguageSwitcher({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
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

// Main Header component
interface HeaderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  onConnectWallet: () => void;
  i18n: any;
}

export default function Header({ lang, setLang, onConnectWallet, i18n }: HeaderProps) {
  const STR = i18n[lang];
  
  return (
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
        <LanguageSwitcher lang={lang} onChange={setLang} />

        <button
          className="rounded-xl px-3 py-2 text-sm font-medium"
          style={{ background: theme.accent, color: theme.text }}
          onClick={onConnectWallet}
        >
          <div className="flex items-center gap-1"><Wallet size={16} /> {STR.header.connect}</div>
        </button>
      </div>
    </header>
  );
}