/**
 * Yield Agent
 *
 * Manages idle group funds between contributions and payout.
 * Decides when to deploy to Blend Protocol and when to withdraw.
 *
 * The logic: money sitting in the contract between rounds earns nothing.
 * Blend Protocol on Stellar lets us stake that money and earn yield.
 * The AI decides if it's safe to deploy — is there enough time before
 * the payout deadline? Is the group at risk? Are all members paid?
 *
 * Members receive slightly more than they contributed. The yield is
 * invisible to them — they just notice the winner gets a bit extra.
 */

import { getGroup, markDeployed, markWithdrawn } from "../contract.js";
import { askAI }                                  from "../llm.js";
import { buildYieldPrompt }                       from "../prompts.js";
import { logDecision }                            from "../logger.js";
import { deployToBlend, withdrawFromBlend }       from "../blend.js";

export async function handleYield(group, members) {
  const nowTs = Math.floor(Date.now() / 1000);

  const result = await askAI(buildYieldPrompt(group, members, nowTs));
  const { action, reasoning } = result;

  // HOLD — no action needed
  if (action === "HOLD") {
    logDecision({
      type:      "YIELD",
      groupId:   group.id,
      action:    "HOLD",
      reasoning,
    });
    return;
  }

  try {
    if (action === "DEPLOY") {
      const idleFunds = Number(group.paid_count) * Number(group.contribution_amount);

      // Deploy to Blend and record on-chain
      await deployToBlend(group.id, idleFunds);
      const txHash = await markDeployed(group.id);

      logDecision({
        type:      "YIELD",
        groupId:   group.id,
        action:    "DEPLOY",
        reasoning,
        txHash,
        metadata:  { amountDeployed: idleFunds },
      });

    } else if (action === "WITHDRAW") {
      // Withdraw from Blend — get back principal + yield
      const { yieldEarned } = await withdrawFromBlend(group.id);
      const txHash = await markWithdrawn(group.id, yieldEarned);

      logDecision({
        type:      "YIELD",
        groupId:   group.id,
        action:    "WITHDRAW",
        reasoning,
        txHash,
        metadata:  { yieldEarned },
      });
    }
  } catch (err) {
    console.error(`[Yield] Error on group ${group.id}:`, err.message);
    logDecision({
      type:      "YIELD",
      groupId:   group.id,
      action:    `${action}_FAILED`,
      reasoning: err.message,
    });
  }
}
