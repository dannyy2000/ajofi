/**
 * Matchmaking Agent
 *
 * Scans all unmatched savings intents on-chain. When it finds people with
 * compatible preferences — same contribution amount, group size, round
 * frequency — it groups them and creates the group on-chain.
 *
 * This is what makes it possible for strangers to save together safely.
 * The AI does the trust work that would otherwise require a personal
 * relationship with every member.
 */

import { getAllIntents, createGroup } from "../contract.js";
import { askAI }                      from "../llm.js";
import { buildMatchmakingPrompt }     from "../prompts.js";
import { logDecision }                from "../logger.js";

export async function runMatchmaking() {
  const allIntents = await getAllIntents();

  const unmatched = allIntents
    .filter((i) => !i.matched && i.wallet)
    .map((i) => ({
      wallet:              i.wallet,
      contributionAmount:  String(i.contribution_amount),
      desiredGroupSize:    Number(i.desired_group_size),
      roundDuration:       Number(i.round_duration),
    }));

  if (unmatched.length < 2) return;

  console.log(`[Matchmaking] ${unmatched.length} unmatched intent(s) found`);

  const result = await askAI(buildMatchmakingPrompt(unmatched));
  const groups  = Array.isArray(result.groups) ? result.groups : [];

  if (groups.length === 0) {
    console.log("[Matchmaking] No compatible groups found this tick");
    return;
  }

  for (const g of groups) {
    try {
      const txHash = await createGroup(
        g.memberWallets,
        g.contributionAmount,
        g.roundDuration,
      );

      logDecision({
        type:      "MATCHMAKING",
        groupId:   null,
        action:    "CREATE_GROUP",
        reasoning: g.reasoning,
        txHash,
        metadata:  {
          members:            g.memberWallets,
          contributionAmount: g.contributionAmount,
          roundDuration:      g.roundDuration,
        },
      });
    } catch (err) {
      console.error("[Matchmaking] Failed to create group:", err.message);
      logDecision({
        type:      "MATCHMAKING",
        groupId:   null,
        action:    "CREATE_GROUP_FAILED",
        reasoning: err.message,
      });
    }
  }
}
