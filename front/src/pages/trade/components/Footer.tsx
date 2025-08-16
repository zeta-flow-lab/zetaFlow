import React from "react";

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

interface FooterProps {
  i18n: any;
  lang: string;
}

export default function Footer({ i18n, lang }: FooterProps) {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14 text-xs" style={{ color: theme.subtext }}>
      <div className="opacity-80">ZetaFlow  2025 · Demo UI · Inspired by ZetaChain brand ethos</div>
    </footer>
  );
}