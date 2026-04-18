/**
 * Yield Agent — Blend Protocol Integration
 *
 * When all members have paid and there is more than 2 hours until the round
 * deadline, idle contributions are deployed to Blend Protocol for yield.
 * The contract calls Blend's submit() directly via cross-contract call —
 * funds never pass through the agent wallet.
 *
 * DEPLOY: contract.deploy_to_blend(group_id)
 *   → AjoFi contract calls Blend pool.submit(Supply request)
 *   → USDC moves from AjoFi → Blend pool
 *   → AjoFi tracks fund_status = Deployed
 *
 * WITHDRAW: contract.withdraw_from_blend(group_id)
 *   → AjoFi contract calls Blend pool.submit(Withdraw request)
 *   → USDC + yield moves from Blend pool → AjoFi
 *   → AjoFi records yield_earned, fund_status = Idle
 *
 * HOLD: anything else — do nothing
 */

import { deployToBlend, withdrawFromBlend } from "../contract.js";
import { askAI }                             from "../llm.js";
import { buildYieldPrompt }                  from "../prompts.js";
import { logDecision }                       from "../logger.js";

export async function handleYield(group, members) {
  const nowTs             = Math.floor(Date.now() / 1000);
  const secsUntilDeadline = Number(group.round_deadline) - nowTs;
  const hoursUntilDeadline = secsUntilDeadline / 3600;
  const fundStatus         = group.fund_status[0] === "Idle" ? 0 : 1;  // enum: ["Idle"] | ["Deployed"]
  const deployedAmount     = Number(group.deployed_amount);
  const totalPaid          = Number(group.paid_count) * Number(group.contribution_amount);
  const idleFunds          = (totalPaid - deployedAmount) / 1e7;

  // Quick guard — skip AI call if clearly nothing to do
  if (fundStatus === 0 && idleFunds <= 0) return;

  let action, reasoning;

  try {
    const result = await askAI(buildYieldPrompt(group, members, nowTs));
    action    = result.action;
    reasoning = result.reasoning;
  } catch (err) {
    console.error(`[Yield] AI decision failed for group ${group.id}:`, err.message);
    return;
  }

  if (action === "HOLD") {
    logDecision({ type: "YIELD", groupId: group.id, action: "HOLD", reasoning });
    return;
  }

  try {
    if (action === "DEPLOY") {
      const txHash = await deployToBlend(group.id);
      logDecision({
        type:     "YIELD",
        groupId:  group.id,
        action:   "DEPLOY",
        reasoning,
        txHash,
        metadata: { idleFunds, hoursUntilDeadline },
      });
      console.log(`[Yield] Group ${group.id}: deployed ${idleFunds} USDC to Blend. tx: ${txHash}`);

    } else if (action === "WITHDRAW") {
      const txHash = await withdrawFromBlend(group.id);
      logDecision({
        type:     "YIELD",
        groupId:  group.id,
        action:   "WITHDRAW",
        reasoning,
        txHash,
        metadata: { hoursUntilDeadline },
      });
      console.log(`[Yield] Group ${group.id}: withdrew from Blend. tx: ${txHash}`);
    }
  } catch (err) {
    console.error(`[Yield] ${action} failed for group ${group.id}:`, err.message);
    logDecision({
      type:      "YIELD",
      groupId:   group.id,
      action:    `${action}_FAILED`,
      reasoning: err.message,
    });
  }
}
