/**
 * Default Predictor Agent
 *
 * Monitors active groups for members who have not paid after the deadline.
 * Decides whether to slash their collateral or wait.
 *
 * This is one of the most sensitive decisions the AI makes. A wrong SLASH
 * permanently damages someone's credit score and takes their collateral.
 * A wrong WAIT means the round winner waits longer than they should.
 *
 * The AI weighs: how late is it, what is the member's history, is this
 * their first offense. Every decision is logged publicly.
 */

import { handleDefault }          from "../contract.js";
import { askAI }                   from "../llm.js";
import { buildDefaultPrompt }      from "../prompts.js";
import { logDecision }             from "../logger.js";

export async function handleDefaults(group, members) {
  const nowTs       = Math.floor(Date.now() / 1000);
  const pastDeadline = nowTs > Number(group.round_deadline);

  if (!pastDeadline) return;

  // Members who haven't paid and still have collateral (not already slashed)
  const defaulters = members.filter((m) => !m.has_paid && m.has_collateral);
  if (defaulters.length === 0) return;

  console.log(`[Default] Group ${group.id} — ${defaulters.length} potential defaulter(s)`);

  for (const defaulter of defaulters) {
    const result = await askAI(buildDefaultPrompt(group, defaulter, members, nowTs));
    const { action, reasoning } = result;

    if (action === "WAIT") {
      logDecision({
        type:      "DEFAULT",
        groupId:   group.id,
        action:    "WAIT",
        reasoning,
        metadata:  { wallet: defaulter.wallet },
      });
      continue;
    }

    if (action === "SLASH") {
      // Pick winner from members who have paid and haven't received a payout yet
      const eligibleWinners = members.filter(
        (m) => m.has_paid && !m.has_received_payout && m.has_collateral
      );

      // Fallback: any paying member
      const payers = members.filter((m) => m.has_paid);

      const candidates = eligibleWinners.length > 0 ? eligibleWinners : payers;
      if (candidates.length === 0) {
        console.error(`[Default] No eligible winner found for group ${group.id}`);
        continue;
      }

      // Highest credit score among candidates
      const winner = candidates.sort(
        (a, b) => Number(b.credit_score) - Number(a.credit_score)
      )[0];

      try {
        const txHash = await handleDefault(
          group.id,
          defaulter.wallet,
          winner.wallet,
          reasoning,
        );

        logDecision({
          type:      "DEFAULT",
          groupId:   group.id,
          action:    "SLASH",
          reasoning,
          txHash,
          metadata:  {
            defaulter: defaulter.wallet,
            winner:    winner.wallet,
          },
        });

        console.log(
          `[Default] Slashed ${defaulter.wallet} in group ${group.id}. Winner: ${winner.wallet}`
        );
      } catch (err) {
        console.error(`[Default] Slash failed for group ${group.id}:`, err.message);
        logDecision({
          type:      "DEFAULT",
          groupId:   group.id,
          action:    "SLASH_FAILED",
          reasoning: err.message,
          metadata:  { defaulter: defaulter.wallet },
        });
      }
    }
  }
}
