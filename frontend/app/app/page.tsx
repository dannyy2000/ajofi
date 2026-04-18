"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Wallet, ArrowLeft, Check } from "lucide-react";

const COUNTRIES = [
  { code: "NG", flag: "🇳🇬", name: "Nigeria", currency: "NGN", symbol: "₦", rate: 1580, desc: "Deposit & withdraw in Naira" },
  { code: "GH", flag: "🇬🇭", name: "Ghana", currency: "GHS", symbol: "₵", rate: 13.5, desc: "Deposit & withdraw in Cedis" },
  { code: "SN", flag: "🇸🇳", name: "Senegal", currency: "XOF", symbol: "CFA", rate: 655, desc: "Francophone West Africa" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", currency: "XOF", symbol: "CFA", rate: 655, desc: "Francophone West Africa" },
  { code: "OTHER", flag: "🌍", name: "Other country", currency: "USD", symbol: "$", rate: 1, desc: "Save with USDC directly" },
];

export default function AppPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [swkReady, setSwkReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authModalRef = useRef<(() => Promise<{ address: string }>) | null>(null);

  // If wallet already connected from a previous session, go straight to dashboard
  useEffect(() => {
    const saved = localStorage.getItem("ajofi_wallet");
    if (saved) router.replace("/dashboard");
  }, [router]);

  // Dynamically import SWK on the client only — avoids SSR issues with rxjs
  useEffect(() => {
    (async () => {
      const { StellarWalletsKit, Networks } = await import("@creit.tech/stellar-wallets-kit");
      const { FreighterModule }             = await import("@creit.tech/stellar-wallets-kit/modules/freighter");
      const { LobstrModule }                = await import("@creit.tech/stellar-wallets-kit/modules/lobstr");
      const { AlbedoModule }                = await import("@creit.tech/stellar-wallets-kit/modules/albedo");

      StellarWalletsKit.init({
        network: Networks.TESTNET,
        modules: [
          new FreighterModule(),
          new LobstrModule(),
          new AlbedoModule(),
        ],
      });

      authModalRef.current = async () => {
        const result = await StellarWalletsKit.authModal();
        // Grab which wallet module the user picked so we can restore it later
        try {
          const id = StellarWalletsKit.selectedModule.productId;
          return { ...result, id };
        } catch {
          return result;
        }
      };
      setSwkReady(true);
    })();
  }, []);

  async function connectWallet() {
    if (!selected || !swkReady || !authModalRef.current) return;
    setConnecting(true);
    try {
      // Opens the multi-wallet picker modal (Freighter, LOBSTR, Albedo, xBull…)
      const { address, id } = await authModalRef.current() as { address: string; id?: string };
      setPublicKey(address);
      localStorage.setItem("ajofi_wallet", address);
      if (id) localStorage.setItem("ajofi_wallet_id", id);
      localStorage.setItem("ajofi_country", selected);
      setConnected(true);
      setTimeout(() => router.push("/intent"), 1200);
    } catch (err) {
      // User closed the modal or wallet rejected — just reset
      console.error("[SWK] wallet connect cancelled:", err);
    } finally {
      setConnecting(false);
    }
  }

  const country = COUNTRIES.find((c) => c.code === selected);

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F8FF" }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #1E1B4B 0%, #312E81 55%, #4C1D95 100%)" }}>

        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #F59E0B, transparent)" }} />
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full opacity-8 pointer-events-none"
          style={{ background: "radial-gradient(circle, #818CF8, transparent)" }} />

        {/* Logo — pinned to top */}
        <Link href="/" className="relative flex items-center gap-2.5 w-fit group mb-0">
          <svg width="38" height="38" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="transition-transform group-hover:scale-105 drop-shadow-md">
            <rect width="36" height="36" rx="10" fill="url(#appGrad)"/>
            <circle cx="13.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
            <circle cx="22.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
            <defs>
              <linearGradient id="appGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#5B21B6"/>
                <stop offset="100%" stopColor="#7C3AED"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="font-black text-xl text-white" style={{ letterSpacing: "-0.04em" }}>AjoFi</span>
        </Link>

        {/* Main content — vertically centered in remaining space */}
        <div className="relative flex-1 flex flex-col justify-center">
          <h2 className="text-[2.6rem] font-black text-white leading-[1.1] mb-5" style={{ letterSpacing: "-0.03em" }}>
            Save together.<br />
            <span style={{ color: "#FCD34D" }}>Win together.</span>
          </h2>
          <p className="text-base leading-relaxed mb-10" style={{ color: "#A5B4FC", lineHeight: "1.7" }}>
            Ajo, susu and tontine — West Africa&apos;s savings tradition, now on-chain and AI-powered.
          </p>

          <div className="space-y-5">
            {[
              { icon: "🔒", title: "Funds are trustless", text: "Locked in a smart contract — nobody runs away with the money" },
              { icon: "🤖", title: "AI Treasurer", text: "Monitors your group 24/7 and earns yield on idle funds" },
              { icon: "💸", title: "Local currency", text: "Deposit and withdraw in NGN or GHS from your bank account" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-base">{item.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#7C83B5" }}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom status */}
        <div className="relative pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#10B981" }} />
            <span className="text-xs font-semibold" style={{ color: "#475569" }}>Stellar Testnet · Live</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">

        {/* Top bar (mobile) */}
        <div className="lg:hidden bg-white border-b px-5 h-14 flex items-center justify-between" style={{ borderColor: "#E2E8F0" }}>
          <Link href="/" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="10" fill="url(#mobileGrad)"/>
              <circle cx="13.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
              <circle cx="22.5" cy="18" r="5.5" fill="none" stroke="white" strokeWidth="2.2" opacity="0.95"/>
              <defs>
                <linearGradient id="mobileGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5B21B6"/>
                  <stop offset="100%" stopColor="#7C3AED"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="font-bold" style={{ color: "#0F172A" }}>AjoFi</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            {connected ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" }}>
                  <Check size={36} style={{ color: "#059669" }} />
                </div>
                <h2 className="text-2xl font-black mb-2" style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>Wallet connected!</h2>
                <p className="mb-3" style={{ color: "#64748B" }}>Taking you to set your savings intent...</p>
                <p className="text-xs font-mono px-3 py-1.5 rounded-lg inline-block" style={{ background: "#F1F5F9", color: "#94A3B8" }}>
                  {publicKey?.slice(0, 10)}...{publicKey?.slice(-8)}
                </p>
                <div className="flex items-center justify-center gap-2 mt-5 text-sm font-medium" style={{ color: "#4338CA" }}>
                  <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  Redirecting...
                </div>
              </div>
            ) : (
              <>
                <div className="mb-10">
                  <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-8 hover:text-indigo-600 transition-colors"
                    style={{ color: "#94A3B8" }}>
                    <ArrowLeft size={14} /> Back to home
                  </Link>
                  <h1 className="text-[2rem] font-black mb-3 leading-tight" style={{ color: "#0F172A", letterSpacing: "-0.035em" }}>
                    Where are you saving from?
                  </h1>
                  <p className="text-base leading-relaxed" style={{ color: "#64748B" }}>
                    Select your country — we&apos;ll show the right currency and ramp options.
                  </p>
                </div>

                <div className="space-y-2.5 mb-8">
                  {COUNTRIES.map((c) => (
                    <button key={c.code} onClick={() => setSelected(c.code)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                      style={{
                        background: selected === c.code ? "#EEF2FF" : "#FFFFFF",
                        borderColor: selected === c.code ? "#4338CA" : "#E8ECF4",
                        boxShadow: selected === c.code ? "0 4px 18px rgba(67,56,202,0.13)" : "0 1px 4px rgba(0,0,0,0.04)",
                        transform: selected === c.code ? "translateY(-1px)" : "none",
                      }}>
                      <span className="text-2xl leading-none">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm" style={{ color: "#0F172A" }}>{c.name}</div>
                        <div className="text-xs mt-0.5 font-medium truncate" style={{ color: "#94A3B8" }}>
                          {c.currency} ({c.symbol}) · {c.desc}
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: selected === c.code ? "#4338CA" : "#D1D9E6",
                          background: selected === c.code ? "#4338CA" : "transparent",
                        }}>
                        {selected === c.code && <Check size={10} className="text-white" />}
                      </div>
                    </button>
                  ))}
                </div>

                {selected && (
                  <div className="flex items-start gap-3 rounded-2xl p-4 mb-6 border"
                    style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                    <span className="text-base mt-0.5">⚡</span>
                    <p className="text-sm" style={{ color: "#92400E" }}>
                      You need a <strong>Stellar wallet</strong> to continue. We support{" "}
                      <strong>Freighter</strong>, <strong>LOBSTR</strong>, <strong>Albedo</strong>, and more.{" "}
                      <a href="https://freighter.app" target="_blank" rel="noreferrer"
                        className="underline font-semibold" style={{ color: "#4338CA" }}>
                        Get Freighter
                      </a>
                      {" "}— it takes 2 minutes.
                    </p>
                  </div>
                )}

                <button
                  onClick={connectWallet}
                  disabled={!selected || connecting || !swkReady}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all"
                  style={{
                    background: selected && swkReady
                      ? "linear-gradient(135deg, #5B21B6, #7C3AED)"
                      : "#E2E8F0",
                    color: selected && swkReady ? "#FFFFFF" : "#94A3B8",
                    cursor: selected && swkReady ? "pointer" : "not-allowed",
                    boxShadow: selected && swkReady ? "0 8px 24px rgba(91,33,182,0.3)" : "none",
                  }}>
                  {connecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting wallet...
                    </>
                  ) : (
                    <>
                      <Wallet size={18} />
                      Connect Stellar Wallet
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <p className="text-center text-xs mt-4 font-medium" style={{ color: "#CBD5E1" }}>
                  By connecting, you agree to save trustlessly on Stellar
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
