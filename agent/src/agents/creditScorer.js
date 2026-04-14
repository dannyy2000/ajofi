/**
 * Credit Scorer Agent
 *
 * Runs after every round event — contribution paid, default handled,
 * round advanced, group completed. Reads the member's full history
 * and produces an updated score from 0 to 100.
 *
 * This score is the backbone of AjoFi's long-term value:
 * - Higher score = lower collateral required in future groups
 * - Higher score = priority for earlier payout rounds
 * - Higher score = matched with other reliable savers
 *
 * For people who have never had a formal credit history, this is the
 * first verifiable record of their financial reliability. It is
 * recorded on Stellar and portable beyond AjoFi.
 */

import { updateCreditScore }       from "../contract.js";
import { askAI }                    from "../llm.js";
import { buildCreditScoringPrompt } from "../prompts.js";
import { logDecision }              from "../logger.js";

export async function scoreMembers(group, members, allGroupsHistory = {}) {
  for (const member of members) {
    // Build this member's history across all groups
    const memberHistory = allGroupsHistory[member.wallet] || {
      currentGroup: {
        groupId:           group.id,
        round:             group.current_round,
        hasPaid:           member.has_paid,
        hasReceivedPayout: member.has_received_payout,
        defaultCount:      member.default_count,
        creditScore:       member.credit_score,
      },
    };

    try {
      const result = await askAI(
        buildCreditScoringPrompt(member.wallet, member.credit_score, memberHistory)
      );

      const { new_score, reasoning } = result;

      if (typeof new_score !== "number" || new_score < 0 || new_score > 100) {
        console.error(`[CreditScorer] Invalid score ${new_score} for ${member.wallet}`);
        continue;
      }

      // Only update if score actually changed
      if (new_score === member.credit_score) continue;

      const txHash = await updateCreditScore(group.id, member.wallet, new_score);

      logDecision({
        type:      "CREDIT_SCORE",
        groupId:   group.id,
        action:    "UPDATE_SCORE",
        reasoning,
        txHash,
        metadata:  {
          wallet:    member.wallet,
          oldScore:  member.credit_score,
          newScore:  new_score,
        },
      });

    } catch (err) {
      console.error(`[CreditScorer] Failed for ${member.wallet}:`, err.message);
    }
  }
}
