/**
 * Yield Agent — HOLD mode
 *
 * Blend yield is disabled on testnet because the existing Blend pool
 * (TestnetV2) requires Blend's own USDC, which is issuer-controlled and
 * cannot be minted by AjoFi. Funds stay idle in the contract until
 * round advancement.
 *
 * To re-enable: deploy a custom Blend pool that accepts tUSDC and
 * swap USDC_ASSET_ID back to the Blend pool's USDC address.
 */

import { logDecision } from "../logger.js";

export async function handleYield(group) {
  logDecision({
    type:      "YIELD",
    groupId:   group.id,
    action:    "HOLD",
    reasoning: "Blend yield disabled on testnet — funds held in contract until payout.",
  });
}
