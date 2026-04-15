"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, Users, Clock, Shield, ArrowRight,
  CheckCircle, AlertCircle, Zap, Plus, ExternalLink, ArrowLeft
} from "lucide-react";

const MOCK_GROUP = {
  id: "1",
  totalMembers: 5,
  currentRound: 2,
  contributionUsdc: "50.00",
  contributionNgn: "79,000",
  roundDeadline: Date.now() + 3 * 24 * 60 * 60 * 1000,
  yieldEarned: "1.24",
  members: [
    { wallet: "GBG4...PUKU", paid: true, creditScore: 100, isYou: true },
    { wallet: "GDKJ...MXYZ", paid: true, creditScore: 95, isYou: false },
    { wallet: "GBRT...ABCD", paid: false, creditScore: 88, isYou: false },
    { wallet: "GCEM...EFGH", paid: true, creditScore: 100, isYou: false },
    { wallet: "GAXW...IJKL", paid: false, creditScore: 72, isYou: false },
  ],
  roundHistory: [
    { round: 1, winner: "GBG4...PUKU", amount: "251.24", date: "Apr 8, 2026", yield: "1.24", isYou: true },
  ],
};

export default function DashboardPage() {
  const [wallet, setWallet] = useState("GBG4...PUKU");
  const [country, setCountry] = useState("NG");

  useEffect(() => {
    const w = localStorage.getItem("ajofi_wallet") || "";
    setWallet(w ? `${w.slice(0,6)}...${w.slice(-4)}` : "GBG4...PUKU");
    setCountry(localStorage.getItem("ajofi_country") || "NG");
  }, []);

  const paidCount = MOCK_GROUP.members.filter((m) => m.paid).length;
  const timeLeft = MOCK_GROUP.roundDeadline - Date.now();
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const ANCHOR_URL = process.env.NEXT_PUBLIC_ANCHOR_URL || "http://localhost:3001";
  const walletRaw = typeof window !== "undefined" ? localStorage.getItem("ajofi_wallet") || "" : "";

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FF" }}>

      {/* Top bar */}
      <div className="glass border-b sticky top-0 z-40 px-5 h-14 flex items-center justify-between"
        style={{ borderColor: "rgba(99,102,241,0.1)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4338CA, #7C3AED)" }}>
            <span className="text-white font-black text-xs">A</span>
          </div>
          <span className="font-black text-lg" style={{ color: "#0F172A" }}>AjoFi</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs px-3 py-1.5 rounded-xl font-bold"
            style={{ background: "#EEF2FF", color: "#4338CA" }}>
            {wallet}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1" style={{ color: "#0F172A" }}>My Dashboard</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Track your active savings group, yield earnings, and credit score.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "USDC Balance", value: "$148.52",
              icon: <TrendingUp size={16} />,
              gradient: "linear-gradient(135deg, #4338CA, #7C3AED)",
              bg: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
              color: "#4338CA",
            },
            {
              label: "Credit Score", value: "100/100",
              icon: <Shield size={16} />,
              gradient: "linear-gradient(135deg, #059669, #10B981)",
              bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
              color: "#059669",
            },
            {
              label: "Active Groups", value: "1",
              icon: <Users size={16} />,
              gradient: "linear-gradient(135deg, #7C3AED, #A78BFA)",
              bg: "linear-gradient(135deg, #F5F3FF, #EDE9FE)",
              color: "#7C3AED",
            },
            {
              label: "Yield Earned", value: "$1.24",
              icon: <Zap size={16} />,
              gradient: "linear-gradient(135deg, #D97706, #F59E0B)",
              bg: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
              color: "#D97706",
            },
          ].map((s) => (
            <div key={s.label} className="card-hover bg-white rounded-2xl p-5 border shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.08)", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold" style={{ color: "#94A3B8" }}>{s.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-black" style={{ color: "#0F172A" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Main group card */}
        <div className="bg-white rounded-3xl border overflow-hidden mb-6 shadow-sm"
          style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>

          {/* Group header */}
          <div className="px-6 py-5 flex items-center justify-between border-b"
            style={{ borderColor: "#F1F5F9", background: "linear-gradient(135deg, #FAFBFF, #F5F7FF)" }}>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="font-black text-lg" style={{ color: "#0F172A" }}>Savings Group #1</h2>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: "#ECFDF5", color: "#059669" }}>
                  Active
                </span>
              </div>
              <p className="text-sm" style={{ color: "#64748B" }}>
                Round {MOCK_GROUP.currentRound} of {MOCK_GROUP.totalMembers} · {MOCK_GROUP.contributionUsdc} USDC per round (≈ ₦{MOCK_GROUP.contributionNgn})
              </p>
            </div>
            <Link href="/group/1"
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border transition-all hover:bg-indigo-50"
              style={{ color: "#4338CA", borderColor: "#C7D2FE" }}>
              Details <ExternalLink size={13} />
            </Link>
          </div>

          {/* Round progress */}
          <div className="px-6 py-5 border-b" style={{ borderColor: "#F1F5F9" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold" style={{ color: "#0F172A" }}>
                Round {MOCK_GROUP.currentRound} — {paidCount}/{MOCK_GROUP.totalMembers} members paid
              </span>
              <span className="text-sm font-semibold px-3 py-1 rounded-lg"
                style={{ background: "#FEF3C7", color: "#92400E" }}>
                <Clock size={12} className="inline mr-1" />
                {daysLeft}d {hoursLeft}h left
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 rounded-full mb-4" style={{ background: "#F1F5F9" }}>
              <div className="h-2.5 rounded-full transition-all"
                style={{
                  width: `${(paidCount / MOCK_GROUP.totalMembers) * 100}%`,
                  background: "linear-gradient(90deg, #4338CA, #7C3AED)",
                }} />
            </div>

            {/* Members grid */}
            <div className="space-y-2">
              {MOCK_GROUP.members.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-2xl transition-colors"
                  style={{ background: m.isYou ? "#F0F4FF" : "#FAFBFC" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                      style={{
                        background: m.isYou ? "linear-gradient(135deg, #4338CA, #7C3AED)" : "#E2E8F0",
                        color: m.isYou ? "#FFFFFF" : "#94A3B8",
                      }}>
                      {i + 1}
                    </div>
                    <div>
                      <span className="text-sm font-mono font-semibold" style={{ color: "#0F172A" }}>{m.wallet}</span>
                      {m.isYou && (
                        <span className="ml-2 text-xs font-black px-2 py-0.5 rounded-md"
                          style={{ background: "#EEF2FF", color: "#4338CA" }}>You</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold" style={{ color: "#94A3B8" }}>
                      Score: <span style={{
                        color: m.creditScore >= 80 ? "#059669" : m.creditScore >= 60 ? "#D97706" : "#DC2626",
                        fontWeight: 800,
                      }}>{m.creditScore}</span>
                    </div>
                    {m.paid
                      ? <CheckCircle size={17} style={{ color: "#10B981" }} />
                      : <AlertCircle size={17} style={{ color: "#F59E0B" }} />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yield banner */}
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.15)", color: "#D97706" }}>
                <Zap size={15} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#92400E" }}>
                <strong>${MOCK_GROUP.yieldEarned} USDC</strong> yield earned on Blend Protocol
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: "rgba(245,158,11,0.15)", color: "#B45309" }}>
              Added to next payout
            </span>
          </div>
        </div>

        {/* Round history */}
        <div className="bg-white rounded-3xl border overflow-hidden mb-6 shadow-sm"
          style={{ borderColor: "rgba(99,102,241,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "#F1F5F9" }}>
            <h3 className="font-black" style={{ color: "#0F172A" }}>Round history</h3>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: "#F1F5F9", color: "#64748B" }}>
              {MOCK_GROUP.roundHistory.length} round{MOCK_GROUP.roundHistory.length !== 1 ? "s" : ""} completed
            </span>
          </div>
          {MOCK_GROUP.roundHistory.map((r) => (
            <div key={r.round} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm"
                  style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", color: "#059669" }}>
                  {r.round}
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2" style={{ color: "#0F172A" }}>
                    Round {r.round} complete
                    {r.isYou && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-md"
                        style={{ background: "#EEF2FF", color: "#4338CA" }}>You won!</span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5 font-medium" style={{ color: "#94A3B8" }}>
                    {r.date} · Winner: {r.winner}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black" style={{ color: "#0F172A" }}>${r.amount}</div>
                <div className="text-xs font-semibold" style={{ color: "#059669" }}>+${r.yield} yield</div>
              </div>
            </div>
          ))}
        </div>

        {/* Deposit / Withdraw */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <a href={`${ANCHOR_URL}/deposit?id=demo&account=${walletRaw}`} target="_blank" rel="noreferrer"
            className="card-hover flex items-center justify-between p-5 rounded-2xl transition-all"
            style={{
              background: "linear-gradient(135deg, #4338CA, #7C3AED)",
              boxShadow: "0 8px 24px rgba(67,56,202,0.3)",
            }}>
            <div>
              <div className="font-black text-white mb-1">Deposit NGN / GHS</div>
              <div className="text-sm" style={{ color: "#A5B4FC" }}>Add funds via bank transfer or mobile money</div>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <Plus size={22} className="text-white" />
            </div>
          </a>

          <a href={`${ANCHOR_URL}/withdraw?id=demo&account=${walletRaw}`} target="_blank" rel="noreferrer"
            className="card-hover flex items-center justify-between p-5 rounded-2xl border transition-all"
            style={{
              background: "#FFFFFF",
              borderColor: "rgba(99,102,241,0.12)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}>
            <div>
              <div className="font-black mb-1" style={{ color: "#0F172A" }}>Withdraw to bank</div>
              <div className="text-sm" style={{ color: "#64748B" }}>Send USDC back to your bank account</div>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)" }}>
              <ArrowRight size={22} style={{ color: "#4338CA" }} />
            </div>
          </a>
        </div>

        {/* New intent CTA */}
        <div className="rounded-2xl border-2 p-5 flex items-center justify-between transition-all hover:border-indigo-300"
          style={{ background: "#FAFBFF", borderColor: "#E2E8F0", borderStyle: "dashed" }}>
          <div>
            <div className="font-black mb-1" style={{ color: "#374151" }}>Start a new savings group</div>
            <div className="text-sm" style={{ color: "#94A3B8" }}>Submit a new intent and get AI-matched with members</div>
          </div>
          <Link href="/intent"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black border transition-all hover:bg-indigo-50"
            style={{ color: "#4338CA", borderColor: "#C7D2FE" }}>
            <Plus size={15} /> New intent
          </Link>
        </div>

      </div>
    </div>
  );
}
