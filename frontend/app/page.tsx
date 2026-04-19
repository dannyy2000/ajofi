"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Shield, Users, Zap, TrendingUp, ChevronDown,
  ArrowRight, Check, Globe, Star, Lock, Moon, Sun
} from "lucide-react";

const FAQS = [
  {
    q: "What is AjoFi?",
    a: "AjoFi brings the traditional ajo (Nigeria), susu (Ghana), and tontine (Francophone Africa) savings system on-chain. A group of people contribute a fixed amount every round, and each round one member collects the full pot. AjoFi does this trustlessly — no organiser needed, no running away with the money.",
  },
  {
    q: "Is my money safe?",
    a: "Yes. Your funds are locked in a Soroban smart contract on the Stellar blockchain. No one — including AjoFi — can move your money. Only the smart contract can release funds, and only according to the rules everyone agreed to when the group was formed.",
  },
  {
    q: "What is the collateral for?",
    a: "Before a group starts, each member locks 2x their contribution amount as collateral. If someone defaults, their collateral covers the group so everyone else is protected. At the end of the savings cycle, your full collateral is returned to you.",
  },
  {
    q: "What if someone does not pay their round?",
    a: "AjoFi's AI Treasurer monitors every group. If a member misses a payment deadline, the AI assesses the situation — giving grace time for genuine cases, but slashing collateral for repeat offenders. The round winner still gets paid on time regardless.",
  },
  {
    q: "How do I deposit and withdraw in Naira or Cedis?",
    a: "AjoFi is integrated with a fiat ramp that supports NGN (Nigeria) and GHS (Ghana). You deposit local currency from your bank account or mobile money, it converts to USDC on Stellar, and you are ready to join a group. Withdrawals work in reverse — USDC back to your bank account.",
  },
  {
    q: "What is the yield I keep hearing about?",
    a: "When your group's savings are sitting idle between rounds, AjoFi's AI deploys them to Blend Protocol — a Stellar-native lending protocol — to earn interest. When your round winner is paid, they receive slightly more than the group contributed. Free money, automatically.",
  },
  {
    q: "Do I need crypto experience?",
    a: "No. You need a Freighter wallet (a browser extension, takes 2 minutes to set up) and a bank account to deposit local currency. Everything else is handled by the AI.",
  },
  {
    q: "Which countries are supported?",
    a: "Currently Nigeria (NGN) and Ghana (GHS) for fiat deposits and withdrawals. You can participate from anywhere with a Stellar wallet. More countries coming soon.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ajofi_dark") === "true";
    setDark(saved);
  }, []);

  const d = dark;

  // ── Theme tokens ──────────────────────────────────────────
  const c = {
    pageBg:      d ? "#0C0B14" : "#F7F8FF",
    surface:     d ? "#13121F" : "#FFFFFF",
    surfaceCard: d ? "#1A192A" : "#FFFFFF",
    navBg:       d ? "rgba(12,11,20,0.92)" : "rgba(255,255,255,0.85)",
    navBorder:   d ? "rgba(139,92,246,0.12)" : "rgba(109,40,217,0.09)",
    textPrimary: d ? "#F1F5F9" : "#0F172A",
    textSecond:  d ? "#94A3B8" : "#475569",
    textMuted:   d ? "#6B7280" : "#64748B",
    textFaint:   d ? "#4B5563" : "#94A3B8",
    border:      d ? "rgba(139,92,246,0.14)" : "rgba(99,102,241,0.08)",
    borderMid:   d ? "#2D2B40" : "#E2E8F0",
    cardShadow:  d ? "0 2px 12px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.04)",
    badgeBg:     d ? "rgba(91,33,182,0.22)" : "#EEF2FF",
    badgeText:   d ? "#A78BFA" : "#4338CA",
    secBg:       d ? "#0F0E1A" : "#FFFFFF",
    toggleBg:    d ? "#1A192A" : "#F1F5F9",
    toggleColor: d ? "#A78BFA" : "#64748B",
  };

  const HOW_IT_WORKS = [
    {
      step: "01",
      title: "Set your intent",
      desc: "Tell AjoFi how much you want to save per round, how many people you want in your group, and for how long.",
      icon: <Globe size={20} />,
      color: "#4338CA",
      bg: d ? "rgba(67,56,202,0.18)" : "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
    },
    {
      step: "02",
      title: "AI matches your group",
      desc: "AjoFi's AI Treasurer scans all open intents and groups people with identical savings goals. Your group forms automatically.",
      icon: <Users size={20} />,
      color: "#7C3AED",
      bg: d ? "rgba(124,58,237,0.18)" : "linear-gradient(135deg, #F5F3FF, #EDE9FE)",
    },
    {
      step: "03",
      title: "Lock collateral, start saving",
      desc: "Each member locks collateral (2× their contribution). This protects everyone. Then rounds begin.",
      icon: <Lock size={20} />,
      color: "#059669",
      bg: d ? "rgba(5,150,105,0.18)" : "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
    },
    {
      step: "04",
      title: "Collect your payout",
      desc: "Each round, one member receives the full pot plus yield earned by the AI while funds were idle.",
      icon: <TrendingUp size={20} />,
      color: "#D97706",
      bg: d ? "rgba(217,119,6,0.18)" : "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: c.pageBg, transition: "background 0.25s ease, color 0.25s ease" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b" style={{
        background: c.navBg,
        borderColor: c.navBorder,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}>
        <div className="w-full px-8 flex items-center justify-between h-[68px]">

          {/* Logo — absolute far LEFT */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"
              className="transition-transform group-hover:scale-105 drop-shadow-md">
              <rect width="36" height="36" rx="10" fill="url(#navGrad)"/>
              <circle cx="13.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
              <circle cx="22.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
              <defs>
                <linearGradient id="navGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5B21B6"/>
                  <stop offset="100%" stopColor="#7C3AED"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="font-black text-xl tracking-tight" style={{ color: c.textPrimary, letterSpacing: "-0.04em" }}>AjoFi</span>
          </Link>

          {/* Links — CENTER */}
          <div className="hidden md:flex items-center gap-1">
            {["How it works", "FAQ"].map((label) => (
              <a key={label}
                href={label === "How it works" ? "#how-it-works" : "#faq"}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ color: c.textSecond }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = "#7C3AED"; (e.target as HTMLElement).style.background = d ? "rgba(124,58,237,0.12)" : "#F5F3FF"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = c.textSecond; (e.target as HTMLElement).style.background = "transparent"; }}>
                {label}
              </a>
            ))}
          </div>

          {/* Right side — dark toggle + Connect — absolute far RIGHT */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => { const next = !dark; setDark(next); localStorage.setItem("ajofi_dark", String(next)); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: c.toggleBg, color: c.toggleColor }}
              aria-label="Toggle dark mode">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link href="/app"
              className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.03] active:scale-95"
              style={{
                background: "linear-gradient(135deg, #5B21B6, #7C3AED)",
                boxShadow: "0 4px 16px rgba(91,33,182,0.35)",
                letterSpacing: "-0.01em",
              }}>
              Connect <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
          <div className="absolute top-20 -left-20 w-72 h-72 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #F59E0B, transparent)" }} />
          <div className="absolute bottom-0 left-1/2 w-full h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${d ? "rgba(139,92,246,0.25)" : "rgba(99,102,241,0.2)"}, transparent)` }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8 border shadow-sm"
            style={{ background: d ? "rgba(91,33,182,0.18)" : "rgba(255,255,255,0.9)", borderColor: d ? "rgba(139,92,246,0.3)" : "rgba(109,40,217,0.22)", color: d ? "#A78BFA" : "#5B21B6" }}>
            <Star size={11} fill={d ? "#A78BFA" : "#5B21B6"} />
            Built on Stellar · Powered by AI
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "#10B981" }} />
            <span style={{ color: "#10B981" }}>Testnet Live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.05] mb-7 tracking-tight" style={{ color: c.textPrimary }}>
            Save together.<br />
            <span className="gradient-text">Win together.</span>
          </h1>

          <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium" style={{ color: c.textSecond }}>
            AjoFi brings ajo, susu and tontine on-chain. The savings tradition West Africa has trusted for generations — now trustless, transparent, and earning yield.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/app"
              className="flex items-center gap-2.5 text-white px-10 py-4 rounded-2xl font-bold text-base transition-all hover:opacity-95 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #5B21B6, #7C3AED)", boxShadow: "0 8px 30px rgba(91,33,182,0.38)" }}>
              Start Saving Free <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base border transition-all hover:border-violet-400"
              style={{ color: c.textSecond, borderColor: c.borderMid, background: c.surface, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Blockchain", value: "Stellar", icon: "⚡" },
              { label: "Yield protocol", value: "Blend", icon: "📈" },
              { label: "Countries", value: "NG · GH", icon: "🌍" },
              { label: "Collateral", value: "2× Safety", icon: "🔒" },
            ].map((s) => (
              <div key={s.label} className="card-hover rounded-2xl p-4 border text-center"
                style={{ background: c.surfaceCard, borderColor: c.border, boxShadow: c.cardShadow }}>
                <div className="text-xl mb-1.5">{s.icon}</div>
                <div className="font-black text-base" style={{ color: c.textPrimary }}>{s.value}</div>
                <div className="text-xs mt-0.5 font-medium" style={{ color: c.textFaint }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── African identity section ── */}
      <section style={{ background: d ? "linear-gradient(135deg, #0D0C1A 0%, #130F2E 50%, #0D0C1A 100%)" : "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%)" }} className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
                style={{ background: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.2)" }}>
                🌍 West Africa's Savings Tradition
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                You already know<br />how this works.
              </h2>
              <p className="leading-relaxed mb-5 text-lg" style={{ color: "#C7D2FE" }}>
                In Nigeria it is called <strong className="text-white">ajo</strong>. In Ghana it is <strong className="text-white">susu</strong>. In Francophone Africa it is <strong className="text-white">tontine</strong>. Different names. Same idea.
              </p>
              <p className="leading-relaxed" style={{ color: "#A5B4FC" }}>
                The problem has always been trust — what if the organiser disappears? AjoFi replaces the organiser with a smart contract. Rules are enforced automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { flag: "🇳🇬", country: "Nigeria", name: "Ajo", desc: "Weekly savings circles in Yoruba and Igbo communities" },
                { flag: "🇬🇭", country: "Ghana", name: "Susu", desc: "Facilitated by susu collectors across all regions" },
                { flag: "🇸🇳", country: "Senegal", name: "Tontine", desc: "Deeply embedded across Francophone West Africa" },
                { flag: "🇨🇮", country: "Côte d'Ivoire", name: "Tontine", desc: "Primary savings vehicle for urban families" },
              ].map((item) => (
                <div key={item.country} className="card-hover rounded-2xl p-5 border"
                  style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
                  <div className="text-3xl mb-3">{item.flag}</div>
                  <div className="font-bold text-white">{item.country}</div>
                  <div className="text-sm font-semibold mt-1" style={{ color: "#FCD34D" }}>{item.name}</div>
                  <div className="text-xs mt-2 leading-relaxed" style={{ color: "#94A3B8" }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-5 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: c.badgeBg, color: c.badgeText }}>
            Simple process
          </div>
          <h2 className="text-4xl font-black mb-4" style={{ color: c.textPrimary }}>Four steps to your first payout</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: c.textMuted }}>
            From your first deposit to collecting your payout — AjoFi handles everything in between.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} className="card-hover rounded-2xl p-6 relative overflow-hidden border"
              style={{ background: c.surfaceCard, borderColor: c.border, boxShadow: c.cardShadow }}>
              <div className="text-6xl font-black absolute -top-2 -right-1 select-none opacity-[0.06]"
                style={{ color: step.color, fontSize: 72 }}>
                {step.step}
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: step.bg as string, color: step.color }}>
                {step.icon}
              </div>
              <div className="text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: step.color }}>
                Step {i + 1}
              </div>
              <h3 className="font-black text-base mb-2" style={{ color: c.textPrimary }}>{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: c.textMuted }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 border-y" style={{ background: c.secBg, borderColor: c.border }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
              style={{ background: c.badgeBg, color: c.badgeText }}>
              Why choose AjoFi
            </div>
            <h2 className="text-4xl font-black mb-4" style={{ color: c.textPrimary }}>Built different</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: c.textMuted }}>
              Traditional ajo has one weakness — the human organiser. AjoFi replaces them with a smart contract and an AI.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Shield size={22} />, color: "#4338CA", bg: d ? "rgba(67,56,202,0.18)" : "linear-gradient(135deg, #EEF2FF, #E0E7FF)", title: "Collateral protection", desc: "Every member locks 2× their contribution before the group starts. If someone defaults, the group is always covered. Your money is never at risk." },
              { icon: <Zap size={22} />, color: "#D97706", bg: d ? "rgba(217,119,6,0.18)" : "linear-gradient(135deg, #FFFBEB, #FEF3C7)", title: "AI Treasurer", desc: "Our AI monitors every group 24/7. It matches members, detects late payments, selects round winners fairly, and deploys idle funds to earn yield automatically." },
              { icon: <TrendingUp size={22} />, color: "#059669", bg: d ? "rgba(5,150,105,0.18)" : "linear-gradient(135deg, #ECFDF5, #D1FAE5)", title: "Earn while you save", desc: "Idle funds between rounds earn yield on Blend Protocol. Winners receive more than the group contributed — at no extra cost to anyone." },
              { icon: <Users size={22} />, color: "#7C3AED", bg: d ? "rgba(124,58,237,0.18)" : "linear-gradient(135deg, #F5F3FF, #EDE9FE)", title: "Automatic matchmaking", desc: "No need to recruit your own group. Set your savings goal and AjoFi finds compatible members automatically. Trustless saving with strangers." },
              { icon: <Globe size={22} />, color: "#0284C7", bg: d ? "rgba(2,132,199,0.18)" : "linear-gradient(135deg, #F0F9FF, #E0F2FE)", title: "Local currency first", desc: "Deposit in NGN or GHS from your bank account or mobile money. Withdraw back to your bank when done. Crypto is invisible." },
              { icon: <Lock size={22} />, color: "#DC2626", bg: d ? "rgba(220,38,38,0.18)" : "linear-gradient(135deg, #FEF2F2, #FEE2E2)", title: "On-chain credit score", desc: "Every completed round builds your score. Higher score = lower collateral, better group matching, and priority payout order." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 group">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 transition-transform group-hover:scale-110"
                  style={{ background: f.bg as string, color: f.color }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-black mb-2" style={{ color: c.textPrimary }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: c.textMuted }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ethics callout ── */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
          style={{
            background: d ? "linear-gradient(135deg, #1A1408, #2A1F0A)" : "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
            border: `1px solid ${d ? "#3D2E0A" : "#FDE68A"}`,
          }}>
          <div className="absolute top-6 right-8 text-6xl opacity-20 select-none">🤝</div>
          <div className="relative">
            <div className="text-4xl mb-5">🤝</div>
            <h2 className="text-2xl md:text-3xl font-black mb-5" style={{ color: c.textPrimary }}>
              Is it ethical to slash someone's collateral?
            </h2>
            <p className="max-w-2xl mx-auto leading-relaxed mb-4 text-base" style={{ color: d ? "#D97706" : "#78350F" }}>
              Every member signs a smart contract before joining. The rules — including collateral slashing — are agreed to upfront. AjoFi enforces a contract that members consented to, similar to how a bank enforces a loan agreement.
            </p>
            <p className="max-w-2xl mx-auto leading-relaxed text-base" style={{ color: d ? "#B45309" : "#92400E" }}>
              The AI gives grace time for genuine cases and only acts after repeated defaults. Every decision is logged publicly and visible to all group members.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 border-t" style={{ background: c.secBg, borderColor: c.border }}>
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
              style={{ background: c.badgeBg, color: c.badgeText }}>
              Got questions?
            </div>
            <h2 className="text-4xl font-black mb-4" style={{ color: c.textPrimary }}>Frequently asked questions</h2>
            <p className="text-lg" style={{ color: c.textMuted }}>Everything you need to know before you start saving.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border rounded-2xl overflow-hidden transition-all"
                style={{
                  borderColor: openFaq === i ? "rgba(124,58,237,0.4)" : c.borderMid,
                  background: openFaq === i ? (d ? "#1A192A" : "#FAFBFF") : c.surface,
                  boxShadow: openFaq === i ? "0 4px 20px rgba(91,33,182,0.1)" : "none",
                }}>
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-bold pr-4 text-base" style={{ color: c.textPrimary }}>{faq.q}</span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: openFaq === i ? "#5B21B6" : (d ? "#2D2B40" : "#F1F5F9") }}>
                    <ChevronDown size={14}
                      style={{
                        color: openFaq === i ? "#FFFFFF" : c.textMuted,
                        transform: openFaq === i ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }} />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-base leading-relaxed border-t" style={{ color: c.textSecond, borderColor: c.border }}>
                    <div className="pt-4">{faq.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden py-24"
        style={{ background: d ? "linear-gradient(135deg, #0D0C1A 0%, #130F2E 40%, #1A0A2E 100%)" : "linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4C1D95 100%)" }}>
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-20 right-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #F59E0B, transparent)" }} />
        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Ready to start saving?
          </h2>
          <p className="text-xl mb-12 leading-relaxed font-medium" style={{ color: "#C7D2FE" }}>
            Join West Africans building financial security together. Your first group is one click away.
          </p>
          <Link href="/app"
            className="inline-flex items-center gap-3 text-white px-12 py-5 rounded-2xl font-black text-lg transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 8px 32px rgba(245,158,11,0.4)" }}>
            Start Saving <ArrowRight size={22} />
          </Link>
          <div className="flex items-center justify-center gap-8 mt-10 text-sm font-medium" style={{ color: "#A5B4FC" }}>
            {["No hidden fees", "Funds on-chain", "AI protected"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.2)" }}>
                  <Check size={10} style={{ color: "#6EE7B7" }} />
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: d ? "#080710" : "#0F172A" }} className="py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="10" fill="url(#footerGrad)"/>
              <circle cx="13.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
              <circle cx="22.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
              <defs>
                <linearGradient id="footerGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5B21B6"/>
                  <stop offset="100%" stopColor="#7C3AED"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="font-black text-white text-lg">AjoFi</span>
          </div>
          <p className="text-sm font-medium" style={{ color: "#475569" }}>
            Built for the Stellar West Africa Build Residency 2026
          </p>
          <div className="flex items-center gap-2 rounded-xl px-4 py-2 border"
            style={{ background: "#1E293B", borderColor: "#334155" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#10B981" }} />
            <span className="text-xs font-semibold" style={{ color: "#94A3B8" }}>Testnet Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
