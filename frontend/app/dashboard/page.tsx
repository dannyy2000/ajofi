"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Users, Clock, Shield, ArrowRight,
  CheckCircle, AlertCircle, Zap, Plus, ExternalLink, Loader2
} from "lucide-react";
// Types inlined to avoid SSR pulling in stellar-sdk at build time
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
interface Intent {
  contribution_amount: bigint;
  desired_group_size: number;
  round_duration: number;
  matched: boolean;
}

const ANCHOR_URL = process.env.NEXT_PUBLIC_ANCHOR_URL || "http://localhost:3001";

// GroupStatus numeric values from contract
const STATUS_FORMING   = 0;
const STATUS_ACTIVE    = 1;
const STATUS_COMPLETED = 2;

function shortenWallet(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function usdcDisplay(stroops: bigint) {
  return (Number(stroops) / 10_000_000).toFixed(2);
}

export default function DashboardPage() {
  const [walletRaw, setWalletRaw]   = useState("");
  const [country, setCountry]       = useState("NG");
  const [loading, setLoading]       = useState(true);
  const [groups, setGroups]         = useState<Group[]>([]);
  const [members, setMembers]       = useState<Record<number, Member[]>>({});
  const [acting, setActing]         = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [myIntent, setMyIntent]     = useState<Intent | null>(null);

  const loadData = useCallback(async (wallet: string) => {
    if (!wallet) { setLoading(false); return; }
    setLoading(true);
    try {
      const { getMemberGroups, getGroup, getGroupMembers, getMyIntent } = await import("../lib/stellar");
      const [groupIds, intent] = await Promise.all([
        getMemberGroups(wallet),
        getMyIntent(wallet),
      ]);
      const groupData: Group[] = [];
      const memberData: Record<number, Member[]> = {};
      for (const id of groupIds) {
        const g = await getGroup(id);
        if (g) {
          groupData.push(g);
          memberData[id] = await getGroupMembers(id);
        }
      }
      setGroups(groupData);
      setMembers(memberData);
      setMyIntent(intent && !intent.matched ? intent : null);
    } catch (e) {
      console.error("[Dashboard] load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const w = localStorage.getItem("ajofi_wallet") || "";
    const c = localStorage.getItem("ajofi_country") || "NG";
    setWalletRaw(w);
    setCountry(c);
    loadData(w);
  }, [loadData]);

  async function handleLockCollateral(groupId: number) {
    setActing(`lock-${groupId}`);
    setActionError(null);
    try {
      const { lockCollateral } = await import("../lib/stellar");
      await lockCollateral(walletRaw, groupId);
      await loadData(walletRaw);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setActing(null);
    }
  }

  async function handlePayContribution(groupId: number) {
    setActing(`pay-${groupId}`);
    setActionError(null);
    try {
      const { payContribution } = await import("../lib/stellar");
      await payContribution(walletRaw, groupId);
      await loadData(walletRaw);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setActing(null);
    }
  }

  const wallet = shortenWallet(walletRaw);

  // Aggregate stats
  const activeGroups  = groups.filter((g) => g.status === STATUS_ACTIVE).length;
  const myMember      = (g: Group) => (members[g.id] || []).find((m) => m.wallet === walletRaw);
  const creditScore   = groups.length > 0
    ? Math.round(groups.reduce((sum, g) => sum + (myMember(g)?.credit_score ?? 100), 0) / groups.length)
    : 100;

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
            {wallet || "Not connected"}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("ajofi_wallet");
              localStorage.removeItem("ajofi_country");
              localStorage.removeItem("ajofi_intent");
              window.location.href = "/app";
            }}
            className="text-xs px-3 py-1.5 rounded-xl font-bold border transition-all hover:bg-red-50"
            style={{ color: "#94A3B8", borderColor: "#E2E8F0" }}>
            Disconnect
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1" style={{ color: "#0F172A" }}>My Dashboard</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Your active savings groups and contributions.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Active Groups", value: loading ? "—" : String(activeGroups),
              icon: <Users size={16} />, bg: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", color: "#4338CA",
            },
            {
              label: "Credit Score", value: loading ? "—" : `${creditScore}/100`,
              icon: <Shield size={16} />, bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", color: "#059669",
            },
            {
              label: "Yield Earned", value: "—",
              icon: <Zap size={16} />, bg: "linear-gradient(135deg, #FFFBEB, #FEF3C7)", color: "#D97706",
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold"
            style={{ color: "#94A3B8" }}>
            <Loader2 size={18} className="animate-spin" />
            Loading your groups from the blockchain...
          </div>
        )}

        {/* No wallet */}
        {!loading && !walletRaw && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔌</div>
            <h3 className="font-black text-lg mb-2" style={{ color: "#0F172A" }}>No wallet connected</h3>
            <p className="text-sm mb-6" style={{ color: "#64748B" }}>Connect a wallet to see your savings groups.</p>
            <Link href="/app" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg, #4338CA, #7C3AED)" }}>
              Connect Wallet <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* Pending intent card — reads from contract, always visible after submit */}
        {!loading && walletRaw && myIntent && groups.length === 0 && (
          <div className="bg-white rounded-3xl border overflow-hidden mb-6 shadow-sm"
            style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
            <div className="px-6 py-5 border-b flex items-center justify-between"
              style={{ borderColor: "#F1F5F9", background: "linear-gradient(135deg, #FAFBFF, #F5F7FF)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: "#EEF2FF" }}>⏳</div>
                <div>
                  <h2 className="font-black text-lg" style={{ color: "#0F172A" }}>Waiting for a match</h2>
                  <p className="text-sm" style={{ color: "#64748B" }}>Your intent is live on-chain — AI is scanning for compatible members</p>
                </div>
              </div>
              <button onClick={() => loadData(walletRaw)}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border transition-all hover:bg-indigo-50"
                style={{ color: "#4338CA", borderColor: "#C7D2FE" }}>
                <TrendingUp size={13} /> Refresh
              </button>
            </div>
            <div className="px-6 py-5 grid grid-cols-3 gap-4">
              {[
                { label: "You save per round", value: `${(Number(myIntent.contribution_amount) / 10_000_000).toFixed(2)} USDC` },
                { label: "Group size", value: `${myIntent.desired_group_size} people` },
                { label: "Round duration", value: myIntent.round_duration === 604800 ? "Weekly" : myIntent.round_duration === 1209600 ? "Bi-weekly" : "Monthly" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-4" style={{ background: "#F8FAFF" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "#94A3B8" }}>{s.label}</p>
                  <p className="font-black" style={{ color: "#0F172A" }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-5">
              <div className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <span>💡</span>
                <p className="text-sm" style={{ color: "#92400E" }}>
                  Once matched, you&apos;ll need to <strong>lock collateral</strong> ({(Number(myIntent.contribution_amount) / 10_000_000 * 2).toFixed(2)} USDC) to activate the group.
                  Use the <strong>Deposit</strong> button below to get tUSDC first.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No intent yet */}
        {!loading && walletRaw && !myIntent && groups.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border shadow-sm"
            style={{ borderColor: "rgba(99,102,241,0.08)" }}>
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="font-black text-lg mb-2" style={{ color: "#0F172A" }}>No savings groups yet</h3>
            <p className="text-sm mb-6 max-w-xs mx-auto leading-relaxed" style={{ color: "#64748B" }}>
              Submit a savings intent and AjoFi&apos;s AI will find matching members for you automatically.
            </p>
            <Link href="/intent"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: "linear-gradient(135deg, #4338CA, #7C3AED)" }}>
              <Plus size={15} /> Submit Intent
            </Link>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mb-4 rounded-xl p-4 text-sm font-semibold"
            style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
            {actionError}
          </div>
        )}

        {/* Groups */}
        {!loading && groups.map((group) => {
          const groupMembers = members[group.id] || [];
          const me = groupMembers.find((m) => m.wallet === walletRaw);
          const paidCount = groupMembers.filter((m) => m.has_paid).length;
          const deadlineSecs = group.round_deadline;
          const nowSecs = Math.floor(Date.now() / 1000);
          const secsLeft = Math.max(0, deadlineSecs - nowSecs);
          const daysLeft  = Math.floor(secsLeft / 86400);
          const hoursLeft = Math.floor((secsLeft % 86400) / 3600);

          const statusLabel = group.status === STATUS_FORMING ? "Forming"
            : group.status === STATUS_ACTIVE ? "Active"
            : "Completed";
          const statusStyle = group.status === STATUS_ACTIVE
            ? { background: "#ECFDF5", color: "#059669" }
            : group.status === STATUS_FORMING
            ? { background: "#FEF3C7", color: "#92400E" }
            : { background: "#F1F5F9", color: "#64748B" };

          const canLockCollateral = group.status === STATUS_FORMING && me && !me.has_collateral;
          const canPay = group.status === STATUS_ACTIVE && me && me.has_collateral && !me.has_paid;
          const lockBusy = acting === `lock-${group.id}`;
          const payBusy  = acting === `pay-${group.id}`;

          return (
            <div key={group.id} className="bg-white rounded-3xl border overflow-hidden mb-6 shadow-sm"
              style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>

              {/* Group header */}
              <div className="px-6 py-5 flex items-center justify-between border-b"
                style={{ borderColor: "#F1F5F9", background: "linear-gradient(135deg, #FAFBFF, #F5F7FF)" }}>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h2 className="font-black text-lg" style={{ color: "#0F172A" }}>
                      Savings Group #{group.id}
                    </h2>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={statusStyle}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#64748B" }}>
                    {group.status === STATUS_FORMING
                      ? `${groupMembers.filter((m) => m.has_collateral).length}/${group.total_members} collateral locked`
                      : `Round ${group.current_round} of ${group.total_members} · ${usdcDisplay(group.contribution_amount)} USDC per round`}
                  </p>
                </div>
                <Link href={`/group/${group.id}`}
                  className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border transition-all hover:bg-indigo-50"
                  style={{ color: "#4338CA", borderColor: "#C7D2FE" }}>
                  Details <ExternalLink size={13} />
                </Link>
              </div>

              {/* Forming state — lock collateral CTA */}
              {group.status === STATUS_FORMING && (
                <div className="px-6 py-5 border-b" style={{ borderColor: "#F1F5F9" }}>
                  <div className="rounded-2xl p-4 mb-4"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: "#92400E" }}>
                      Lock your collateral to activate the group
                    </p>
                    <p className="text-xs" style={{ color: "#B45309" }}>
                      You need to lock {usdcDisplay(group.collateral_amount)} USDC as collateral.
                      Once all {group.total_members} members lock, the group becomes active.
                    </p>
                  </div>
                  {canLockCollateral && (
                    <button
                      onClick={() => handleLockCollateral(group.id)}
                      disabled={!!acting}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white transition-all"
                      style={{
                        background: acting ? "#E2E8F0" : "linear-gradient(135deg, #D97706, #F59E0B)",
                        boxShadow: acting ? "none" : "0 4px 14px rgba(217,119,6,0.3)",
                        cursor: acting ? "not-allowed" : "pointer",
                      }}>
                      {lockBusy ? <><Loader2 size={14} className="animate-spin" /> Locking...</> : "Lock Collateral"}
                    </button>
                  )}
                  {me?.has_collateral && (
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#059669" }}>
                      <CheckCircle size={16} /> Your collateral is locked
                    </div>
                  )}
                </div>
              )}

              {/* Active state — round progress */}
              {group.status === STATUS_ACTIVE && (
                <div className="px-6 py-5 border-b" style={{ borderColor: "#F1F5F9" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold" style={{ color: "#0F172A" }}>
                      Round {group.current_round} — {paidCount}/{group.total_members} members paid
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
                        width: `${(paidCount / group.total_members) * 100}%`,
                        background: "linear-gradient(90deg, #4338CA, #7C3AED)",
                      }} />
                  </div>

                  {/* Pay contribution CTA */}
                  {canPay && (
                    <div className="rounded-2xl p-4 mb-4"
                      style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}>
                      <p className="text-sm font-semibold mb-3" style={{ color: "#3730A3" }}>
                        Your contribution of {usdcDisplay(group.contribution_amount)} USDC is due
                      </p>
                      <button
                        onClick={() => handlePayContribution(group.id)}
                        disabled={!!acting}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white transition-all"
                        style={{
                          background: acting ? "#E2E8F0" : "linear-gradient(135deg, #4338CA, #7C3AED)",
                          boxShadow: acting ? "none" : "0 4px 14px rgba(67,56,202,0.3)",
                          cursor: acting ? "not-allowed" : "pointer",
                        }}>
                        {payBusy ? <><Loader2 size={14} className="animate-spin" /> Paying...</> : "Pay Contribution"}
                      </button>
                    </div>
                  )}

                  {/* Past payout recipients */}
                  {groupMembers.some((m) => m.has_received_payout) && (
                    <div className="rounded-2xl p-4 mb-4 flex items-start gap-3"
                      style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                      <span className="text-lg">🏆</span>
                      <div>
                        <p className="text-sm font-black mb-1" style={{ color: "#065F46" }}>Payout recipients</p>
                        {groupMembers.filter((m) => m.has_received_payout).map((m) => (
                          <p key={m.wallet} className="text-xs font-mono font-semibold" style={{ color: "#047857" }}>
                            {shortenWallet(m.wallet)}{m.wallet === walletRaw ? " (You)" : ""} — received {usdcDisplay(group.contribution_amount * BigInt(group.total_members))} USDC
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Members list */}
                  <div className="space-y-2">
                    {groupMembers.map((m, i) => {
                      const isMe = m.wallet === walletRaw;
                      return (
                        <div key={i} className="flex items-center justify-between py-3 px-4 rounded-2xl"
                          style={{ background: isMe ? "#F0F4FF" : "#FAFBFC" }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                              style={{
                                background: m.has_received_payout ? "linear-gradient(135deg, #059669, #10B981)"
                                  : isMe ? "linear-gradient(135deg, #4338CA, #7C3AED)" : "#E2E8F0",
                                color: (m.has_received_payout || isMe) ? "#FFFFFF" : "#94A3B8",
                              }}>
                              {m.has_received_payout ? "✓" : i + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-mono font-semibold" style={{ color: "#0F172A" }}>
                                  {shortenWallet(m.wallet)}
                                </span>
                                {isMe && (
                                  <span className="text-xs font-black px-2 py-0.5 rounded-md"
                                    style={{ background: "#EEF2FF", color: "#4338CA" }}>You</span>
                                )}
                                {m.has_received_payout && (
                                  <span className="text-xs font-black px-2 py-0.5 rounded-md"
                                    style={{ background: "#ECFDF5", color: "#059669" }}>Paid out ✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold" style={{ color: "#94A3B8" }}>
                              Score: <span style={{
                                color: m.credit_score >= 80 ? "#059669" : m.credit_score >= 60 ? "#D97706" : "#DC2626",
                                fontWeight: 800,
                              }}>{m.credit_score}</span>
                            </span>
                            {m.has_paid
                              ? <CheckCircle size={17} style={{ color: "#10B981" }} />
                              : <AlertCircle size={17} style={{ color: "#F59E0B" }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed */}
              {group.status === STATUS_COMPLETED && (
                <div className="px-6 py-5 border-b text-center" style={{ borderColor: "#F1F5F9" }}>
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-black" style={{ color: "#059669" }}>Group completed!</p>
                  <p className="text-sm mt-1" style={{ color: "#64748B" }}>All rounds finished. Collateral has been returned.</p>
                </div>
              )}

            </div>
          );
        })}

        {/* Deposit / Withdraw */}
        {walletRaw && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <a href={`${ANCHOR_URL}/deposit?id=demo&account=${walletRaw}`} target="_blank" rel="noreferrer"
              className="card-hover flex items-center justify-between p-5 rounded-2xl transition-all"
              style={{ background: "linear-gradient(135deg, #4338CA, #7C3AED)", boxShadow: "0 8px 24px rgba(67,56,202,0.3)" }}>
              <div>
                <div className="font-black text-white mb-1">Deposit NGN / GHS</div>
                <div className="text-sm" style={{ color: "#A5B4FC" }}>Get tUSDC via bank transfer or mobile money</div>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                <Plus size={22} className="text-white" />
              </div>
            </a>
            <a href={`${ANCHOR_URL}/withdraw?id=demo&account=${walletRaw}`} target="_blank" rel="noreferrer"
              className="card-hover flex items-center justify-between p-5 rounded-2xl border transition-all"
              style={{ background: "#FFFFFF", borderColor: "rgba(99,102,241,0.12)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div>
                <div className="font-black mb-1" style={{ color: "#0F172A" }}>Withdraw to bank</div>
                <div className="text-sm" style={{ color: "#64748B" }}>Send tUSDC back to your bank account</div>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)" }}>
                <ArrowRight size={22} style={{ color: "#4338CA" }} />
              </div>
            </a>
          </div>
        )}

        {/* New intent CTA */}
        <div className="rounded-2xl border-2 p-5 flex items-center justify-between transition-all hover:border-indigo-300"
          style={{ background: "#FAFBFF", borderColor: "#E2E8F0", borderStyle: "dashed" }}>
          <div>
            <div className="font-black mb-1" style={{ color: "#374151" }}>Start a new savings group</div>
            <div className="text-sm" style={{ color: "#94A3B8" }}>Submit a new intent and get AI-matched with members</div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("ajofi_intent");
              window.location.href = "/intent";
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black border transition-all hover:bg-indigo-50"
            style={{ color: "#4338CA", borderColor: "#C7D2FE" }}>
            <Plus size={15} /> New intent
          </button>
        </div>

      </div>
    </div>
  );
}
