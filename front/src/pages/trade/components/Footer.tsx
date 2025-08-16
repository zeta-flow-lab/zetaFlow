import React from "react";
import { ArrowLeftRight, Bot, Shield } from "lucide-react";
import { type Lang } from "../utils/languageUtils";

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

// GlassCard component from trade.tsx
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border backdrop-blur-xl ${className}`} style={{ borderColor: theme.line, background: theme.surface }}>
      {children}
    </div>
  );
}

// Tag component from trade.tsx
function Tag({ label, color = theme.subtext }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ background: `${color}26`, color }}
    >
      {label}
    </span>
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

interface FooterProps {
  i18n: any;
  lang: Lang; // 使用正确的 Lang 类型
}

export default function Footer({ i18n, lang }: FooterProps) {
  const STR = i18n[lang]; // 添加 STR 常量以访问当前语言的翻译
  
  return (
    <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-5">
      {/* 三列优势特性卡片 */}
      <div className="mx-auto mb-10 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        <FeatureCard icon={<ArrowLeftRight />} title={STR.features.f1_title} desc={STR.features.f1_desc} tag={STR.features.f1_tag} />
        <FeatureCard icon={<Bot />} title={STR.features.f2_title} desc={STR.features.f2_desc} tag={STR.features.f2_tag} />
        <FeatureCard icon={<Shield />} title={STR.features.f3_title} desc={STR.features.f3_desc} tag={STR.features.f3_tag} />
      </div>
      
      {/* 原有的页脚版权信息 */}
      <div className="text-xs" style={{ color: theme.subtext }}>
        <div className="opacity-80">ZetaFlow  2025 · Demo UI · Inspired by ZetaChain brand ethos</div>
      </div>
    </footer>
  );
}