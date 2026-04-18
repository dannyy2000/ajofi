/**
 * AjoFi Treasurer — Main Loop
 *
 * This is the autonomous agent that runs 24/7. Every 15 seconds it:
 *
 *   1. Scans for unmatched savings intents and forms groups
 *   2. For every active group:
 *      a. Checks for past-deadline defaulters
 *      b. Advances the round if all members have paid
 *      c. Manages yield deployment to Blend Protocol
 *      d. Updates credit scores after round events
 *
 * The treasurer never holds funds. It reads the Soroban contract state
 * and submits signed transactions that instruct the contract to act.
 * Every decision is logged publicly so members can audit the reasoning.
 *
 * This is what replaces the human organizer who could disappear with
 * everyone's savings. The treasurer cannot steal. It can only execute
 * rules that members agreed to when they locked their collateral.
 */

import { getAllActiveGroups, getGroup, getGroupMembers } from "./contract.js";
import { runMatchmaking }                                 from "./agents/matchmaking.js";
import { handleDefaults }                                 from "./agents/defaultPredictor.js";
import { handleRoundAdvancement }                         from "./agents/roundAdvancement.js";
import { handleYield }                                    from "./agents/yieldAgent.js";
import { scoreMembers }                                   from "./agents/creditScorer.js";

const POLL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "15000");


async function tick() {
  console.log(`\n[${new Date().toISOString()}] Treasurer tick`);

  try {
    // ── 1. Matchmaking ───────────────────────────────────────────────────────
    await runMatchmaking();

    // ── 2. Process active groups ─────────────────────────────────────────────
    const activeGroupIds = await getAllActiveGroups();
    console.log(`[Loop] Active groups: ${activeGroupIds.length}`);

    for (const groupId of activeGroupIds) {
      const group   = await getGroup(groupId);
      const members = await getGroupMembers(groupId);

      if (!group || !members.length) continue;

      const memberViews = members.map((m) => ({
        wallet:              m.wallet,
        has_paid:            m.has_paid,
        has_collateral:      m.has_collateral,
        has_received_payout: m.has_received_payout,
        credit_score:        Number(m.credit_score),
        default_count:       Number(m.default_count),
      }));

      const groupView = {
        id:                  groupId,
        contribution_amount: group.contribution_amount,
        collateral_amount:   group.collateral_amount,
        total_members:       Number(group.total_members),
        current_round:       Number(group.current_round),
        paid_count:          Number(group.paid_count),
        round_deadline:      group.round_deadline,
        round_duration:      group.round_duration,
        fund_status:         Number(group.fund_status),
        yield_earned:        group.yield_earned,
      };

      // a. Check for defaults (past deadline, unpaid members)
      await handleDefaults(groupView, memberViews);

      // b. Score members BEFORE advancing — has_paid is still true for everyone
      //    who paid. Scoring after the advance sees has_paid=false (reset) and
      //    the AI wrongly penalises members for "not paying yet" in the new round.
      const allPaidNow = Number(groupView.paid_count) === Number(groupView.total_members);
      if (allPaidNow) {
        await scoreMembers(groupView, memberViews);
      }

      // c. Advance round if all members paid
      const roundBefore = groupView.current_round;
      await handleRoundAdvancement(groupView, memberViews);

      // c. Yield management
      await handleYield(groupView, memberViews);
    }
  } catch (err) {
    console.error("[Loop] Unhandled error in tick:", err.message);
  }
}

export async function startTreasurer() {
  console.log("─────────────────────────────────────────────");
  console.log("  AjoFi Treasurer starting");
  console.log(`  Network:  ${process.env.SOROBAN_RPC_URL}`);
  console.log(`  Contract: ${process.env.CONTRACT_ID}`);
  console.log(`  Agent:    ${(await import("./stellar.js")).agentKeypair.publicKey()}`);
  console.log(`  Interval: ${POLL_MS}ms`);
  console.log("─────────────────────────────────────────────");

  await tick(); // run immediately on start

  setInterval(async () => {
    await tick();
  }, POLL_MS);
}
