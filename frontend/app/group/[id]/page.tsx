"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, CheckCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

// Types inlined to avoid SSR pulling in stellar-sdk
interface Group {
  id: number; contribution_amount: bigint; collateral_amount: bigint;
  total_members: number; current_round: number; paid_count: number;
  round_deadline: number; round_duration: number;
  status: number; fund_status: number; yield_earned: bigint;
  member_addresses: string[];
}
interface Member {
  wallet: string; has_paid: boolean; has_collateral: boolean;
  has_received_payout: boolean; credit_score: number; default_count: number;
}

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const STATUS_LABELS: Record<number, string> = { 0: "Forming", 1: "Active", 2: "Completed" };
const STATUS_COLORS: Record<number, string> = { 0: "#D97706", 1: "#059669", 2: "#6B7280" };
const STATUS_BG:    Record<number, string> = { 0: "rgba(217,119,6,0.15)", 1: "rgba(16,185,129,0.2)", 2: "rgba(107,114,128,0.15)" };

function shortenWallet(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function usdcDisplay(stroops: bigint) {
  return (Number(stroops) / 10_000_000).toFixed(2);
}
function durationLabel(secs: number) {
  if (secs <= 604800)  return "Weekly";
  if (secs <= 1209600) return "Bi-weekly";
  return "Monthly";
}
function timeLeft(deadline: number) {
  const diff = deadline * 1000 - Date.now();
  if (diff <= 0) return "Expired";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export default function GroupPage() {
  const { id } = useParams();
  const router  = useRouter();
  const groupId = Number(id);

  const [wallet,  setWallet]  = useState("");
  const [group,   setGroup]   = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [txDone,  setTxDone]  = useState<string | null>(null);

  const load = useCallback(async (w: string) => {
    setLoading(true);
    try {
      const { getGroup, getGroupMembers } = await import("../../lib/stellar");
      const [g, ms] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
      setGroup(g);
      setMembers(ms);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load group");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    const w = localStorage.getItem("ajofi_wallet") || "";
    if (!w) { router.replace("/app"); return; }
    setWallet(w);
    load(w);
  }, [router, load]);

  const myMember = members.find((m) => m.wallet === wallet);

  async function handlePay() {
    if (!wallet || !group) return;
    setActing(true); setError(null); setTxDone(null);
    try {
      const { payContribution } = await import("../../lib/stellar");
      const hash = await payContribution(wallet, groupId);
      setTxDone(hash);
      await load(wallet);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setActing(false);
    }
  }

  async function handleLock() {
    if (!wallet || !group) return;
    setActing(true); setError(null); setTxDone(null);
    try {
      const { lockCollateral } = await import("../../lib/stellar");
      const hash = await lockCollateral(wallet, groupId);
      setTxDone(hash);
      await load(wallet);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F8FF" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: "#6366F1" }} />
          <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading group data…</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F8FF" }}>
        <div className="text-center">
          <p className="font-bold mb-3" style={{ color: "#0F172A" }}>Group #{groupId} not found</p>
          <Link href="/dashboard" className="text-sm text-indigo-600 underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const paidCount    = members.filter((m) => m.has_paid).length;
  const roundPercent = (group.current_round / group.total_members) * 100;
  const potUsdc      = usdcDisplay(group.contribution_amount * BigInt(group.total_members));
  const yieldUsdc    = usdcDisplay(group.yield_earned);
  const contribUsdc  = usdcDisplay(group.contribution_amount);

  const canPay  = group.status === 1 && !!myMember && !myMember.has_paid;
  const canLock = group.status === 0 && !!myMember && !myMember.has_collateral;

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FF" }}>

      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-40 px-5 h-14 flex items-center justify-between"
        style={{ borderColor: "#E2E8F0" }}>
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
            <span className="font-black" style={{ color: "#0F172A" }}>Group #{groupId}</span>
          </div>
        </div>
        <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
          target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:bg-indigo-50"
          style={{ color: "#4338CA", borderColor: "#C7D2FE" }}>
          View on Explorer <ExternalLink size={11} />
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">

        {/* Action feedback */}
        {txDone && (
          <div className="mb-4 px-4 py-3 rounded-2xl border text-sm font-medium flex items-center gap-2"
            style={{ background: "#ECFDF5", borderColor: "#A7F3D0", color: "#065F46" }}>
            <CheckCircle size={16} />
            Transaction confirmed!{" "}
            <a href={`https://stellar.expert/explorer/testnet/tx/${txDone}`} target="_blank" rel="noreferrer"
              className="underline">View TX</a>
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl border text-sm font-medium"
            style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B" }}>
            {error}
          </div>
        )}

        {/* Group overview card */}
        <div className="rounded-3xl overflow-hidden mb-6 shadow-lg"
          style={{ background: "linear-gradient(160deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)" }}>
          <div className="px-8 py-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-black text-white">Savings Group #{groupId}</h1>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: STATUS_BG[group.status], color: STATUS_COLORS[group.status] }}>
                    {STATUS_LABELS[group.status]}
                  </span>
                </div>
                <p style={{ color: "#A5B4FC" }}>
                  {group.total_members} members · {contribUsdc} USDC per round · {durationLabel(group.round_duration)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold mb-1" style={{ color: "#A5B4FC" }}>Round</div>
                <div className="text-3xl font-black text-white">
                  {group.current_round}
                  <span className="text-lg" style={{ color: "#6B7280" }}>/{group.total_members}</span>
                </div>
              </div>
            </div>

            {/* Cycle progress */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "#A5B4FC" }}>Cycle progress</span>
              <span className="text-xs font-semibold" style={{ color: "#A5B4FC" }}>{Math.round(roundPercent)}%</span>
            </div>
            <div className="w-full h-2 rounded-full mb-6" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-2 rounded-full"
                style={{ width: `${roundPercent}%`, background: "linear-gradient(90deg, #818CF8, #A78BFA)" }} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Pot this round", value: `$${potUsdc}`,   icon: "💰" },
                { label: "Yield earned",   value: `$${yieldUsdc}`, icon: "⚡" },
                { label: "Members paid",   value: `${paidCount}/${group.total_members}`, icon: "✅" },
                { label: "Time left",      value: group.round_deadline > 0 ? timeLeft(group.round_deadline) : "—", icon: "⏱" },
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

          {/* Action buttons */}
          {(canPay || canLock) && (
            <div className="px-8 pb-6">
              {canLock && (
                <button onClick={handleLock} disabled={acting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm"
                  style={{ background: "#F59E0B", color: "#1C1917" }}>
                  {acting ? <Loader2 size={16} className="animate-spin" /> : "🔒"}
                  {acting ? "Locking…" : `Lock Collateral (${usdcDisplay(group.collateral_amount)} USDC)`}
                </button>
              )}
              {canPay && (
                <button onClick={handlePay} disabled={acting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm"
                  style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "#FFFFFF" }}>
                  {acting ? <Loader2 size={16} className="animate-spin" /> : "💸"}
                  {acting ? "Paying…" : `Pay Contribution (${contribUsdc} USDC)`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Members list */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-3xl border overflow-hidden shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.08)" }}>
              <div className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: "#F1F5F9" }}>
                <h2 className="font-black" style={{ color: "#0F172A" }}>Members</h2>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: "#F1F5F9", color: "#64748B" }}>
                  {paidCount}/{group.total_members} paid this round
                </span>
              </div>

              <div className="p-4 space-y-2">
                {members.map((m, i) => {
                  const isYou = m.wallet === wallet;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl"
                      style={{ background: isYou ? "#F0F4FF" : "#FAFBFC" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                          style={{
                            background: isYou ? "linear-gradient(135deg, #4338CA, #7C3AED)" : "#E2E8F0",
                            color: isYou ? "#FFFFFF" : "#94A3B8",
                          }}>
                          {m.has_received_payout ? "✓" : i + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold" style={{ color: "#0F172A" }}>
                              {shortenWallet(m.wallet)}
                            </span>
                            {isYou && (
                              <span className="text-xs font-black px-1.5 py-0.5 rounded"
                                style={{ background: "#EEF2FF", color: "#4338CA" }}>You</span>
                            )}
                            {m.has_received_payout && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                                style={{ background: "#ECFDF5", color: "#059669" }}>Received payout</span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5 font-medium" style={{ color: "#94A3B8" }}>
                            {m.default_count > 0
                              ? `${m.default_count} default${m.default_count > 1 ? "s" : ""}`
                              : "Clean record"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold" style={{ color: "#94A3B8" }}>Score</div>
                          <div className="font-black text-sm" style={{
                            color: m.credit_score >= 90 ? "#059669" : m.credit_score >= 70 ? "#D97706" : "#DC2626",
                          }}>
                            {m.credit_score}
                          </div>
                        </div>
                        {m.has_paid
                          ? <CheckCircle size={18} style={{ color: "#10B981" }} />
                          : <AlertCircle size={18} style={{ color: "#F59E0B" }} />
                        }
                      </div>
                    </div>
                  );
                })}
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
                  { label: "Network",      value: "Stellar Testnet" },
                  { label: "Contract",     value: `${CONTRACT_ID.slice(0,8)}...${CONTRACT_ID.slice(-6)}` },
                  { label: "Fund status",  value: group.fund_status === 0 ? "IDLE" : "DEPLOYED" },
                  { label: "Collateral",   value: `${usdcDisplay(group.collateral_amount)} USDC` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: "#F1F5F9" }}>
                    <span className="text-xs font-semibold" style={{ color: "#94A3B8" }}>{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* My status */}
            {myMember && (
              <div className="bg-white rounded-2xl border p-5 shadow-sm"
                style={{ borderColor: "rgba(99,102,241,0.08)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)" }}>
                    <Zap size={13} style={{ color: "#4338CA" }} />
                  </div>
                  <h3 className="font-black text-sm" style={{ color: "#0F172A" }}>Your status</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Collateral locked", value: myMember.has_collateral ? "Yes ✅" : "No ⚠️" },
                    { label: "Paid this round",   value: myMember.has_paid        ? "Yes ✅" : "No" },
                    { label: "Received payout",   value: myMember.has_received_payout ? "Yes ✅" : "Pending" },
                    { label: "Credit score",      value: String(myMember.credit_score) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0"
                      style={{ borderColor: "#F1F5F9" }}>
                      <span className="text-xs font-semibold" style={{ color: "#94A3B8" }}>{item.label}</span>
                      <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
