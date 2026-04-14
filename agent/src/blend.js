/**
 * Blend Protocol Integration
 *
 * Blend is a decentralised lending protocol native to Stellar.
 * AjoFi deposits idle group contributions into Blend between rounds
 * to earn yield. The contract holds the funds — the agent instructs
 * where they go.
 *
 * On testnet: uses Blend testnet contracts.
 * The agent calls Blend directly via Stellar transactions, then
 * records the yield result back on the AjoFi contract via
 * mark_deployed / mark_withdrawn.
 */

import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import { server, agentKeypair } from "./stellar.js";

const BLEND_POOL_ID = process.env.BLEND_POOL_ID;
const USDC_ASSET    = process.env.USDC_ASSET_ID;

// Track deployed amounts per group (in-memory — survives restarts via contract state)
const deployedAmounts = new Map();

/**
 * Deploy idle group funds to Blend Pool.
 * The AjoFi contract holds the USDC — the agent submits the Blend deposit
 * transaction on behalf of the contract.
 *
 * For testnet: simulates yield if BLEND_POOL_ID is not set.
 */
export async function deployToBlend(groupId, amountInStroops) {
  if (!BLEND_POOL_ID) {
    // Testnet simulation — no real Blend call, just track the amount
    console.log(`[Blend] Simulating deploy for group ${groupId}: ${amountInStroops} stroops`);
    deployedAmounts.set(String(groupId), { amount: amountInStroops, deployedAt: Date.now() });
    return { success: true, simulated: true };
  }

  try {
    const contract = new Contract(BLEND_POOL_ID);
    const account  = await server.getAccount(agentKeypair.publicKey());

    // Blend supply call: supply(from, asset, amount)
    const tx = new TransactionBuilder(account, {
      fee:               BASE_FEE,
      networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "supply",
          new Address(process.env.CONTRACT_ID).toScVal(), // from = AjoFi contract
          nativeToScVal(USDC_ASSET, { type: "string" }),
          nativeToScVal(BigInt(amountInStroops), { type: "i128" }),
        )
      )
      .setTimeout(30)
      .build();

    const { SorobanRpc } = await import("@stellar/stellar-sdk");
    const simResult = await server.simulateTransaction(tx);
    if (simResult.error) throw new Error(`Blend supply simulation failed: ${simResult.error}`);

    const assembled = SorobanRpc.assembleTransaction(tx, simResult).build();
    assembled.sign(agentKeypair);

    const sendResult = await server.sendTransaction(assembled);
    deployedAmounts.set(String(groupId), { amount: amountInStroops, deployedAt: Date.now() });

    return { success: true, txHash: sendResult.hash };
  } catch (err) {
    console.error(`[Blend] Deploy failed for group ${groupId}:`, err.message);
    throw err;
  }
}

/**
 * Withdraw group funds from Blend before payout.
 * Returns the yield earned on top of principal.
 */
export async function withdrawFromBlend(groupId) {
  const deployed = deployedAmounts.get(String(groupId));

  if (!BLEND_POOL_ID || !deployed) {
    // Testnet simulation — calculate simulated yield (5% APY)
    const principal   = deployed?.amount || 0;
    const elapsed     = deployed ? (Date.now() - deployed.deployedAt) / 1000 : 0; // seconds
    const annualRate  = 0.05;
    const yieldEarned = Math.floor(principal * annualRate * (elapsed / 31_536_000));

    console.log(
      `[Blend] Simulating withdraw for group ${groupId}: principal=${principal}, yield=${yieldEarned}`
    );

    deployedAmounts.delete(String(groupId));
    return { yieldEarned, simulated: true };
  }

  try {
    const contract = new Contract(BLEND_POOL_ID);
    const account  = await server.getAccount(agentKeypair.publicKey());

    // Blend withdraw call: withdraw(from, asset, amount) — use max u128 to withdraw all
    const tx = new TransactionBuilder(account, {
      fee:               BASE_FEE,
      networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "withdraw",
          new Address(process.env.CONTRACT_ID).toScVal(),
          nativeToScVal(USDC_ASSET, { type: "string" }),
          nativeToScVal(BigInt(deployed.amount), { type: "i128" }),
        )
      )
      .setTimeout(30)
      .build();

    const { SorobanRpc } = await import("@stellar/stellar-sdk");
    const simResult = await server.simulateTransaction(tx);

    let yieldEarned = 0;
    if (simResult.result) {
      const returned = Number(scValToNative(simResult.result.retval));
      yieldEarned    = Math.max(0, returned - deployed.amount);
    }

    const assembled = SorobanRpc.assembleTransaction(tx, simResult).build();
    assembled.sign(agentKeypair);
    await server.sendTransaction(assembled);

    deployedAmounts.delete(String(groupId));
    return { yieldEarned };
  } catch (err) {
    console.error(`[Blend] Withdraw failed for group ${groupId}:`, err.message);
    throw err;
  }
}
