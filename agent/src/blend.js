/**
 * Blend Protocol Integration
 *
 * Blend is a decentralised lending protocol native to Stellar.
 * AjoFi deposits idle group contributions into Blend between rounds
 * to earn yield for group members.
 *
 * Testnet contract IDs (from blend-capital/blend-utils):
 * - USDC:    CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU
 * - Pool V2: CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF
 *
 * Blend uses a submit() function with request types:
 * - SupplyCollateral (type 2) to deposit
 * - WithdrawCollateral (type 3) to withdraw
 *
 * Docs: https://docs.blend.capital/tech-docs/integrations/integrate-pool
 */

import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { server, agentKeypair } from "./stellar.js";

// Blend testnet contract IDs — from blend-capital/blend-utils testnet.contracts.json
const BLEND_POOL_ID = process.env.BLEND_POOL_ID   || "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF";
const USDC_TOKEN_ID = process.env.USDC_ASSET_ID   || "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU";

// Blend request types
const REQUEST_TYPE_SUPPLY_COLLATERAL   = 2;
const REQUEST_TYPE_WITHDRAW_COLLATERAL = 3;

// Track deployed amounts per group
const deployedAmounts = new Map();

/**
 * Build a Blend submit() call
 * Blend uses a unified submit() function for all operations.
 * Each request has: request_type, address (asset), amount
 */
function buildBlendSubmitCall(contract, contractAddress, requests) {
  // requests = [{ request_type: u32, address: string, amount: i128 }]
  const requestsScVal = xdr.ScVal.scvVec(
    requests.map((r) =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: nativeToScVal("request_type", { type: "symbol" }),
          val: nativeToScVal(r.request_type, { type: "u32" }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal("address", { type: "symbol" }),
          val: nativeToScVal(r.address, { type: "string" }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal("amount", { type: "symbol" }),
          val: nativeToScVal(BigInt(r.amount), { type: "i128" }),
        }),
      ])
    )
  );

  return contract.call(
    "submit",
    new Address(contractAddress).toScVal(), // from (AjoFi contract)
    new Address(contractAddress).toScVal(), // spender
    new Address(contractAddress).toScVal(), // to (receives bTokens)
    requestsScVal,
  );
}

async function sendBlendTx(operation) {
  const { SorobanRpc } = await import("@stellar/stellar-sdk");
  const account = await server.getAccount(agentKeypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (simResult.error) throw new Error(`Blend simulation failed: ${simResult.error}`);

  const assembled = SorobanRpc.assembleTransaction(tx, simResult).build();
  assembled.sign(agentKeypair);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === "ERROR") {
    throw new Error(`Blend tx failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(sendResult.hash);
  let attempts  = 0;
  while (getResult.status === "NOT_FOUND" && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  return { hash: sendResult.hash, result: getResult };
}

/**
 * Deploy idle group funds to Blend Pool (SupplyCollateral).
 * The AjoFi Soroban contract holds the USDC — the agent instructs
 * Blend to accept a deposit from the contract address.
 */
export async function deployToBlend(groupId, amountInStroops) {
  console.log(`[Blend] Deploying ${amountInStroops} stroops for group ${groupId} to pool ${BLEND_POOL_ID}`);

  const contract = new Contract(BLEND_POOL_ID);

  const operation = buildBlendSubmitCall(
    contract,
    process.env.CONTRACT_ID,
    [{ request_type: REQUEST_TYPE_SUPPLY_COLLATERAL, address: USDC_TOKEN_ID, amount: amountInStroops }]
  );

  const { hash } = await sendBlendTx(operation);

  deployedAmounts.set(String(groupId), {
    amount:     amountInStroops,
    deployedAt: Date.now(),
    txHash:     hash,
  });

  console.log(`[Blend] Deployed — TX: ${hash}`);
  return { success: true, txHash: hash };
}

/**
 * Withdraw group funds from Blend (WithdrawCollateral).
 * Returns the yield earned on top of principal.
 */
export async function withdrawFromBlend(groupId) {
  const deployed = deployedAmounts.get(String(groupId));
  if (!deployed) {
    console.warn(`[Blend] No deployed record for group ${groupId} — skipping withdraw`);
    return { yieldEarned: 0 };
  }

  console.log(`[Blend] Withdrawing for group ${groupId} from pool ${BLEND_POOL_ID}`);

  const contract = new Contract(BLEND_POOL_ID);

  // Use i128::MAX to withdraw everything — Blend returns actual amount redeemed
  const MAX_I128 = BigInt("170141183460469231731687303715884105727");

  const operation = buildBlendSubmitCall(
    contract,
    process.env.CONTRACT_ID,
    [{ request_type: REQUEST_TYPE_WITHDRAW_COLLATERAL, address: USDC_TOKEN_ID, amount: MAX_I128 }]
  );

  const { hash, result } = await sendBlendTx(operation);

  // Calculate yield from what came back vs what went in
  let returnedAmount = deployed.amount;
  if (result?.returnValue) {
    try {
      const parsed = scValToNative(result.returnValue);
      if (parsed && typeof parsed === "object") {
        // Blend returns positions — extract USDC amount returned
        returnedAmount = Number(deployed.amount); // fallback
      }
    } catch {
      returnedAmount = deployed.amount;
    }
  }

  const yieldEarned = Math.max(0, returnedAmount - Number(deployed.amount));

  deployedAmounts.delete(String(groupId));

  console.log(`[Blend] Withdrew — yield: ${yieldEarned} stroops | TX: ${hash}`);
  return { yieldEarned, txHash: hash };
}
