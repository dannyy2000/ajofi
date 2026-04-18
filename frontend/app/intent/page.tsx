"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Users, Clock, DollarSign, ArrowLeft, Info } from "lucide-react";

const CURRENCY_RATES: Record<string, { symbol: string; name: string; rate: number; flag: string }> = {
  NG: { symbol: "₦", name: "NGN", rate: 1580, flag: "🇳🇬" },
  GH: { symbol: "₵", name: "GHS", rate: 13.5, flag: "🇬🇭" },
  SN: { symbol: "CFA", name: "XOF", rate: 655, flag: "🇸🇳" },
  CI: { symbol: "CFA", name: "XOF", rate: 655, flag: "🇨🇮" },
  OTHER: { symbol: "$", name: "USD", rate: 1, flag: "🌍" },
};

const DURATIONS = [
  { label: "Weekly", value: 604800, desc: "7 days" },
  { label: "Bi-weekly", value: 1209600, desc: "14 days" },
  { label: "Monthly", value: 2592000, desc: "30 days" },
];

const GROUP_SIZES = [2, 3, 4, 5, 6, 8, 10];

export default function IntentPage() {
  const router = useRouter();
  const [country, setCountry] = useState("NG");
  const [wallet, setWallet] = useState("");
  const [localAmount, setLocalAmount] = useState("");
  const [groupSize, setGroupSize] = useState(2);
  const [duration, setDuration] = useState(604800);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const w = localStorage.getItem("ajofi_wallet") || "";
    const c = localStorage.getItem("ajofi_country") || "NG";
    setCountry(c);
    setWallet(w);
    // If no wallet at all, send back to connect
    if (!w) { router.replace("/app"); return; }
    // If user already submitted an intent (localStorage), check if it's still
    // active on-chain. If the group completed, the intent is stale — clear it.
    const existingIntent = localStorage.getItem("ajofi_intent");
    if (existingIntent) { router.replace("/dashboard"); return; }
    // (If localStorage was cleared by "New intent" button, fall through to the form)
    // Also check the contract — the previous session may have confirmed on-chain
    // but crashed before localStorage was set (e.g. "Bad union switch" error).
    (async () => {
      try {
        const { getMyIntent } = await import("../lib/stellar");
        const onChainIntent = await getMyIntent(w);
        // Only redirect if intent exists AND is still unmatched (waiting for group).
        // If matched=true the group already exists — user can submit a new intent.
        if (onChainIntent && !onChainIntent.matched) {
          localStorage.setItem("ajofi_intent", JSON.stringify({
            wallet: w,
            amount: (Number(onChainIntent.contribution_amount) / 1e7).toFixed(2),
            groupSize: onChainIntent.desired_group_size,
            duration: onChainIntent.round_duration,
            submittedAt: Date.now(),
          }));
          router.replace("/dashboard");
        }
      } catch { /* contract read failure is non-fatal — show the form */ }
    })();
  }, [router]);

  const curr = CURRENCY_RATES[country] || CURRENCY_RATES.NG;
  const usdcAmount = localAmount ? (parseFloat(localAmount) / curr.rate).toFixed(2) : "0.00";
  const totalReceive = localAmount ? (parseFloat(usdcAmount) * groupSize).toFixed(2) : "0.00";
  const collateral = localAmount ? (parseFloat(usdcAmount) * 2).toFixed(2) : "0.00";
  const selectedDuration = DURATIONS.find((d) => d.value === duration)!;
  const cycleWeeks = Math.round((duration * groupSize) / 604800);
  const hasAmount = localAmount && parseFloat(localAmount) > 0;

  const [error, setError] = useState<string | null>(null);

  async function submitIntent() {
    if (!hasAmount || !wallet) return;
    setSubmitting(true);
    setError(null);
    try {
      const { registerIntent } = await import("../lib/stellar");
      await registerIntent(wallet, parseFloat(usdcAmount), groupSize, duration);
      localStorage.setItem("ajofi_intent", JSON.stringify({
        wallet, amount: usdcAmount, groupSize, duration,
        currency: curr.name, localAmount, submittedAt: Date.now(),
      }));
      setSubmitted(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setError(msg.includes("require_auth") || msg.includes("sign") ? "Wallet rejected the transaction." : msg);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "#F7F8FF" }}>
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)" }}>
            <span className="text-5xl">🎉</span>
          </div>
          <h2 className="text-2xl font-black mb-3" style={{ color: "#0F172A" }}>Intent submitted!</h2>
          <p className="mb-6 leading-relaxed" style={{ color: "#64748B" }}>
            Your savings intent is on-chain. AjoFi's AI is scanning for matching members right now.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: "#4338CA" }}>
            <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            Opening your dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FF" }}>

      {/* Top bar */}
      <div className="glass border-b sticky top-0 z-40 px-5 h-14 flex items-center justify-between"
        style={{ borderColor: "rgba(99,102,241,0.1)" }}>
        <div className="flex items-center gap-4">
          <Link href="/app" className="flex items-center gap-1.5 text-sm font-medium hover:text-indigo-600 transition-colors"
            style={{ color: "#94A3B8" }}>
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="h-4 w-px" style={{ background: "#E2E8F0" }} />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4338CA, #7C3AED)" }}>
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-black" style={{ color: "#0F172A" }}>AjoFi</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl font-semibold"
          style={{ background: "#EEF2FF", color: "#4338CA" }}>
          {curr.flag} {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-10">

        <div className="mb-10">
          <h1 className="text-3xl font-black mb-2" style={{ color: "#0F172A" }}>Set your savings intent</h1>
          <p style={{ color: "#64748B" }}>
            Tell AjoFi how you want to save. The AI will find matching members automatically — no group recruiting needed.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* Form */}
          <div className="lg:col-span-3 space-y-5">

            {/* Amount input */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <label className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: "#0F172A" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#EEF2FF", color: "#4338CA" }}>
                  <DollarSign size={14} />
                </div>
                How much per round?
              </label>

              <div className="flex rounded-xl border-2 overflow-hidden transition-all focus-within:border-indigo-400"
                style={{ borderColor: "#E2E8F0" }}>
                <div className="px-4 flex items-center text-sm font-black border-r gap-2 flex-shrink-0"
                  style={{ background: "#F8FAFF", borderColor: "#E2E8F0", color: "#4338CA", minWidth: 80 }}>
                  {curr.flag} {curr.name}
                </div>
                <input type="number" value={localAmount} onChange={(e) => setLocalAmount(e.target.value)}
                  placeholder="e.g. 50,000" min="0"
                  className="flex-1 px-4 py-3.5 text-base font-semibold outline-none bg-white"
                  style={{ color: "#0F172A" }} />
              </div>

              {hasAmount && (
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: "#EEF2FF", color: "#4338CA" }}>
                    = {usdcAmount} USDC per round
                  </div>
                  <span className="text-xs" style={{ color: "#94A3B8" }}>
                    Rate: 1 USDC = {curr.rate.toLocaleString()} {curr.name}
                  </span>
                </div>
              )}
            </div>

            {/* Group size */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <label className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: "#0F172A" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                  <Users size={14} />
                </div>
                Group size
              </label>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {GROUP_SIZES.map((s) => (
                  <button key={s} onClick={() => setGroupSize(s)}
                    className="py-3 rounded-xl text-sm font-black border-2 transition-all"
                    style={{
                      background: groupSize === s ? "linear-gradient(135deg, #4338CA, #7C3AED)" : "#F8FAFF",
                      color: groupSize === s ? "#FFFFFF" : "#475569",
                      borderColor: groupSize === s ? "#4338CA" : "#E2E8F0",
                      boxShadow: groupSize === s ? "0 4px 12px rgba(67,56,202,0.25)" : "none",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg"
                style={{ background: "#F8FAFF", color: "#64748B" }}>
                <Info size={11} />
                {groupSize} people save together. Each person receives the full pot once. {groupSize} rounds total.
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <label className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: "#0F172A" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#ECFDF5", color: "#059669" }}>
                  <Clock size={14} />
                </div>
                Round duration
              </label>
              <div className="grid grid-cols-3 gap-3">
                {DURATIONS.map((d) => (
                  <button key={d.value} onClick={() => setDuration(d.value)}
                    className="flex flex-col items-center py-4 px-3 rounded-2xl border-2 transition-all"
                    style={{
                      background: duration === d.value ? "#EEF2FF" : "#F8FAFF",
                      borderColor: duration === d.value ? "#4338CA" : "#E2E8F0",
                      boxShadow: duration === d.value ? "0 4px 12px rgba(67,56,202,0.12)" : "none",
                    }}>
                    <span className="font-black text-sm" style={{ color: duration === d.value ? "#4338CA" : "#0F172A" }}>
                      {d.label}
                    </span>
                    <span className="text-xs mt-0.5 font-medium" style={{ color: "#94A3B8" }}>{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-20">
              <div className="rounded-3xl overflow-hidden shadow-xl"
                style={{
                  background: "linear-gradient(160deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)",
                  boxShadow: "0 20px 60px rgba(67,56,202,0.35)",
                }}>

                <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#A5B4FC" }}>
                    Your savings plan
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    {curr.flag} {curr.name} · {groupSize} members · {selectedDuration.label}
                  </p>
                </div>

                <div className="p-6 space-y-4">

                  {/* Per round */}
                  <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "#A5B4FC" }}>You save per round</div>
                    <div className="text-3xl font-black text-white">
                      {hasAmount ? `${curr.symbol}${parseFloat(localAmount).toLocaleString()}` : <span style={{ color: "#4B5563" }}>—</span>}
                    </div>
                    {hasAmount && (
                      <div className="text-sm mt-1 font-semibold" style={{ color: "#818CF8" }}>{usdcAmount} USDC</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: "#A5B4FC" }}>You receive</div>
                      <div className="text-lg font-black text-white">{totalReceive} USDC</div>
                      <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>when your turn comes</div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: "#A5B4FC" }}>Collateral</div>
                      <div className="text-lg font-black text-white">{collateral} USDC</div>
                      <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>returned at end</div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "#A5B4FC" }}>Cycle length</div>
                    <div className="text-lg font-black text-white">{groupSize} rounds</div>
                    <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>~{cycleWeeks} weeks total</div>
                  </div>

                  {/* Yield note */}
                  <div className="rounded-2xl p-4 border" style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.2)" }}>
                    <div className="flex items-start gap-2">
                      <span className="text-base">⚡</span>
                      <p className="text-xs leading-relaxed" style={{ color: "#FDE68A" }}>
                        Idle funds earn yield on Blend Protocol. Your payout will include a bonus on top of contributions.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl p-3 text-xs font-semibold"
                      style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                      {error}
                    </div>
                  )}

                  <button onClick={submitIntent} disabled={!hasAmount || submitting}
                    className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: hasAmount ? "linear-gradient(135deg, #F59E0B, #D97706)" : "rgba(255,255,255,0.1)",
                      color: hasAmount ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                      cursor: hasAmount ? "pointer" : "not-allowed",
                      boxShadow: hasAmount ? "0 8px 24px rgba(245,158,11,0.35)" : "none",
                    }}>
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting intent...
                      </>
                    ) : (
                      <>Submit Intent <ArrowRight size={18} /></>
                    )}
                  </button>

                  <p className="text-center text-xs" style={{ color: "#4B5563" }}>
                    No funds move until your group is formed
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
