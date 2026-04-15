"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Shield, Zap, Users, Clock,
  CheckCircle, AlertCircle, TrendingUp, ExternalLink
} from "lucide-react";

const MOCK_GROUP = {
  id: "1",
  totalMembers: 5,
  currentRound: 2,
  contributionUsdc: "50.00",
  contributionNgn: "79,000",
  roundDeadline: Date.now() + 3 * 24 * 60 * 60 * 1000,
  yieldEarned: "1.24",
  totalPot: "250.00",
  fundStatus: "IDLE",
  contractId: "CBO5AIFD7CJ54NN4MFLR74R4J5N36OUYJUOQKJ37MOSSA6WSPPYZ2CMD",
  members: [
    { wallet: "GBG4EEG3...PUKU", fullWallet: "GBG4EEG3R6NAUD5EPSXSOYZ6R4G67ORKIRIOP4AQWEEXBZO6BC56PUKU", paid: true, creditScore: 100, defaults: 0, hasCollateral: true, hasReceived: true, isYou: true },
    { wallet: "GDKJ...MXYZ", fullWallet: "GDKJMXYZ1234", paid: true, creditScore: 95, defaults: 0, hasCollateral: true, hasReceived: false, isYou: false },
    { wallet: "GBRT...ABCD", fullWallet: "GBRTABCD1234", paid: false, creditScore: 88, defaults: 0, hasCollateral: true, hasReceived: false, isYou: false },
    { wallet: "GCEM...EFGH", fullWallet: "GCEMEFGH1234", paid: true, creditScore: 100, defaults: 0, hasCollateral: true, hasReceived: false, isYou: false },
    { wallet: "GAXW...IJKL", fullWallet: "GAXWIJKL1234", paid: false, creditScore: 72, defaults: 1, hasCollateral: true, hasReceived: false, isYou: false },
  ],
  roundHistory: [
    { round: 1, winner: "GBG4EEG3...PUKU", amount: "251.24", date: "Apr 8, 2026", yield: "1.24", txHash: "acd3...b44f", isYou: true },
  ],
};

export default function GroupPage() {
  const { id } = useParams();
  const paidCount = MOCK_GROUP.members.filter((m) => m.paid).length;
  const timeLeft = MOCK_GROUP.roundDeadline - Date.now();
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const roundPercent = (MOCK_GROUP.currentRound / MOCK_GROUP.totalMembers) * 100;

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FF" }}>

      {/* Top bar */}
      <div className="glass border-b sticky top-0 z-40 px-5 h-14 flex items-center justify-between"
        style={{ borderColor: "rgba(99,102,241,0.1)" }}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-medium hover:text-indigo-600 transition-colors"
            style={{ color: "#94A3B8" }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <div className="h-4 w-px" style={{ background: "#E2E8F0" }} />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4338CA, #7C3AED)" }}>
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-black" style={{ color: "#0F172A" }}>Group #{id}</span>
          </div>
        </div>
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${MOCK_GROUP.contractId}`}
          target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:bg-indigo-50"
          style={{ color: "#4338CA", borderColor: "#C7D2FE" }}>
          View on Explorer <ExternalLink size={11} />
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">

        {/* Group overview */}
        <div className="rounded-3xl overflow-hidden mb-6 shadow-lg"
          style={{ background: "linear-gradient(160deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)" }}>
          <div className="px-8 py-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-black text-white">Savings Group #{id}</h1>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(16,185,129,0.2)", color: "#6EE7B7" }}>
                    Active
                  </span>
                </div>
                <p style={{ color: "#A5B4FC" }}>
                  {MOCK_GROUP.totalMembers} members · {MOCK_GROUP.contributionUsdc} USDC per round · Weekly
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold mb-1" style={{ color: "#A5B4FC" }}>Round</div>
                <div className="text-3xl font-black text-white">
                  {MOCK_GROUP.currentRound}<span className="text-lg" style={{ color: "#6B7280" }}>/{MOCK_GROUP.totalMembers}</span>
                </div>
              </div>
            </div>

            {/* Cycle progress */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "#A5B4FC" }}>Cycle progress</span>
              <span className="text-xs font-semibold" style={{ color: "#A5B4FC" }}>{Math.round(roundPercent)}%</span>
            </div>
            <div className="w-full h-2 rounded-full mb-6" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-2 rounded-full" style={{ width: `${roundPercent}%`, background: "linear-gradient(90deg, #818CF8, #A78BFA)" }} />
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Pot this round", value: `$${MOCK_GROUP.totalPot}`, icon: "💰" },
                { label: "Yield earned", value: `$${MOCK_GROUP.yieldEarned}`, icon: "⚡" },
                { label: "Members paid", value: `${paidCount}/${MOCK_GROUP.totalMembers}`, icon: "✅" },
                { label: "Time left", value: `${daysLeft}d ${hoursLeft}h`, icon: "⏱" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="text-lg mb-1">{s.icon}</div>
                  <div className="font-black text-white text-sm">{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Members */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-3xl border overflow-hidden shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.08)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <div className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "#F1F5F9" }}>
                <h2 className="font-black" style={{ color: "#0F172A" }}>Members</h2>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: "#F1F5F9", color: "#64748B" }}>
                  {paidCount}/{MOCK_GROUP.totalMembers} paid this round
                </span>
              </div>

              <div className="p-4 space-y-2">
                {MOCK_GROUP.members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl"
                    style={{ background: m.isYou ? "#F0F4FF" : "#FAFBFC" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{
                          background: m.isYou ? "linear-gradient(135deg, #4338CA, #7C3AED)" : "#E2E8F0",
                          color: m.isYou ? "#FFFFFF" : "#94A3B8",
                        }}>
                        {m.hasReceived ? "✓" : i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold" style={{ color: "#0F172A" }}>{m.wallet}</span>
                          {m.isYou && (
                            <span className="text-xs font-black px-1.5 py-0.5 rounded"
                              style={{ background: "#EEF2FF", color: "#4338CA" }}>You</span>
                          )}
                          {m.hasReceived && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "#ECFDF5", color: "#059669" }}>Received payout</span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5 font-medium" style={{ color: "#94A3B8" }}>
                          {m.defaults > 0 ? `${m.defaults} default${m.defaults > 1 ? "s" : ""}` : "Clean record"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-semibold" style={{ color: "#94A3B8" }}>Score</div>
                        <div className="font-black text-sm" style={{
                          color: m.creditScore >= 90 ? "#059669" : m.creditScore >= 70 ? "#D97706" : "#DC2626",
                        }}>
                          {m.creditScore}
                        </div>
                      </div>
                      {m.paid
                        ? <CheckCircle size={18} style={{ color: "#10B981" }} />
                        : <AlertCircle size={18} style={{ color: "#F59E0B" }} />
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Contract info */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.08)" }}>
              <h3 className="font-black mb-4 text-sm" style={{ color: "#0F172A" }}>Contract info</h3>
              <div className="space-y-3">
                {[
                  { label: "Network", value: "Stellar Testnet" },
                  { label: "Contract", value: `${MOCK_GROUP.contractId.slice(0,8)}...${MOCK_GROUP.contractId.slice(-6)}` },
                  { label: "Fund status", value: MOCK_GROUP.fundStatus },
                  { label: "Yield protocol", value: "Blend Protocol" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: "#F1F5F9" }}>
                    <span className="text-xs font-semibold" style={{ color: "#94A3B8" }}>{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI decisions */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.08)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", color: "#4338CA" }}>
                  <Zap size={13} />
                </div>
                <h3 className="font-black text-sm" style={{ color: "#0F172A" }}>AI Treasurer log</h3>
              </div>
              <div className="space-y-3">
                {[
                  { action: "HOLD", time: "2 mins ago", note: "All members paid — awaiting deadline before paying out." },
                  { action: "DEPLOY", time: "8 hrs ago", note: "Deployed $250 to Blend Protocol to earn yield." },
                  { action: "MATCH", time: "Apr 10", note: "Matched 5 members with identical ₦79,000 weekly intent." },
                ].map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-xs font-black px-2 py-0.5 rounded-md h-fit flex-shrink-0 mt-0.5"
                      style={{
                        background: log.action === "HOLD" ? "#F1F5F9" : log.action === "DEPLOY" ? "#FFFBEB" : "#EEF2FF",
                        color: log.action === "HOLD" ? "#64748B" : log.action === "DEPLOY" ? "#D97706" : "#4338CA",
                      }}>
                      {log.action}
                    </span>
                    <div>
                      <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{log.note}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: "#CBD5E1" }}>{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Round history */}
        {MOCK_GROUP.roundHistory.length > 0 && (
          <div className="bg-white rounded-3xl border overflow-hidden mt-6 shadow-sm"
            style={{ borderColor: "rgba(99,102,241,0.08)" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "#F1F5F9" }}>
              <h2 className="font-black" style={{ color: "#0F172A" }}>Payout history</h2>
            </div>
            {MOCK_GROUP.roundHistory.map((r) => (
              <div key={r.round} className="px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black"
                    style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", color: "#059669" }}>
                    {r.round}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2" style={{ color: "#0F172A" }}>
                      Round {r.round} — {r.winner}
                      {r.isYou && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg"
                          style={{ background: "#EEF2FF", color: "#4338CA" }}>You won!</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5 font-medium flex items-center gap-2" style={{ color: "#94A3B8" }}>
                      {r.date}
                      <a href={`https://stellar.expert/explorer/testnet/tx/${r.txHash}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 hover:text-indigo-500 transition-colors"
                        style={{ color: "#94A3B8" }}>
                        TX: {r.txHash} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg" style={{ color: "#0F172A" }}>${r.amount}</div>
                  <div className="text-xs font-semibold" style={{ color: "#059669" }}>incl. ${r.yield} yield</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
