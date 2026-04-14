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

import { advanceRound, markWithdrawn } from "../contract.js";
import { askAI }                        from "../llm.js";
import { buildRoundAdvancementPrompt }  from "../prompts.js";
import { logDecision }                  from "../logger.js";
import { withdrawFromBlend }            from "../blend.js";

export async function handleRoundAdvancement(group, members) {
  const allPaid = Number(group.paid_count) === Number(group.total_members);
  if (!allPaid) return;

  // Withdraw from Blend first if funds are deployed
  if (Number(group.fund_status) === 1) {
    try {
      const { yieldEarned } = await withdrawFromBlend(group.id);
      const txHash = await markWithdrawn(group.id, yieldEarned);

      logDecision({
        type:      "YIELD",
        groupId:   group.id,
        action:    "WITHDRAW",
        reasoning: "All members have paid. Withdrawing from Blend Protocol before advancing round.",
        txHash,
        metadata:  { yieldEarned },
      });
    } catch (err) {
      console.error(`[Round] Blend withdrawal failed for group ${group.id}:`, err.message);
      // Do not advance if withdrawal failed — funds may still be in Blend
      return;
    }
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
