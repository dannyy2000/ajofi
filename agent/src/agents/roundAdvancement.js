/**
 * Round Advancement Agent
 *
 * When all members have paid their contributions for a round, this agent
 * selects who receives the payout and advances the group to the next round.
 *
 * Winner selection is not random — it is based on rotation order and credit
 * score. Members who have not yet received a payout are eligible. Among them,
 * higher credit score gets priority for earlier rounds. This rewards
 * consistent payers and gives people an incentive to maintain their score.
 *
 * If funds were deployed to Blend, they are withdrawn first before advancing.
 */

import { advanceRound }               from "../contract.js";
import { askAI }                       from "../llm.js";
import { buildRoundAdvancementPrompt } from "../prompts.js";
import { logDecision }                 from "../logger.js";

// Tracks "groupId-round" pairs already advanced this process lifetime.
// Prevents duplicate advances when the RPC returns stale paid_count after a
// successful advance transaction (Soroban testnet state can lag ~30s).
const advancedRounds = new Set();

export async function handleRoundAdvancement(group, members) {
  const allPaid = Number(group.paid_count) === Number(group.total_members);
  if (!allPaid) return;

  const roundKey = `${group.id}-${group.current_round}`;
  if (advancedRounds.has(roundKey)) return; // already advanced this round

  // Block advancement if funds are still in Blend — withdraw must happen first
  if (group.fund_status[0] !== "Idle") {
    console.log(`[Round] Group ${group.id}: funds still deployed to Blend, skipping advancement`);
    return;
  }

  // Ask AI to select the winner
  const result = await askAI(buildRoundAdvancementPrompt(group, members));
  const { winner, reasoning } = result;

  if (!winner) {
    console.error(`[Round] AI returned no winner for group ${group.id}`);
    return;
  }

  // Validate winner is a real member who hasn't received a payout
  const winnerMember = members.find((m) => m.wallet === winner);
  if (!winnerMember) {
    console.error(`[Round] Winner ${winner} is not a member of group ${group.id}`);
    return;
  }

  try {
    const txHash = await advanceRound(group.id, winner);

    // Mark as advanced AFTER success so we don't retry on stale RPC reads
    advancedRounds.add(roundKey);

    logDecision({
      type:      "ROUND_ADVANCE",
      groupId:   group.id,
      action:    "ADVANCE",
      reasoning,
      txHash,
      metadata:  {
        round:  Number(group.current_round),
        winner,
        payout: Number(group.paid_count) * Number(group.contribution_amount),
      },
    });

    console.log(`[Round] Group ${group.id} round ${group.current_round} advanced. Winner: ${winner}`);
  } catch (err) {
    console.error(`[Round] Advance failed for group ${group.id}:`, err.message);
    logDecision({
      type:      "ROUND_ADVANCE",
      groupId:   group.id,
      action:    "ADVANCE_FAILED",
      reasoning: err.message,
    });
  }
}
