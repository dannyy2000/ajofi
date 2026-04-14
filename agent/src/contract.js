/**
 * AjoFi Contract Client
 *
 * Everything the agent needs to read from and write to the Soroban vault
 * contract. The agent never holds member funds — it only signs and submits
 * instructions. The contract holds and moves everything.
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

const CONTRACT_ID = process.env.CONTRACT_ID;

// ─────────────────────────────────────────────────────────────────────────────
// Read Functions — no transaction needed, just query ledger state
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllIntents() {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account  = await server.getAccount(agentKeypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee:        BASE_FEE,
      networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
    })
      .addOperation(contract.call("get_all_intents"))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (!result.result) return [];

    const raw = scValToNative(result.result.retval);
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error("[Contract] getAllIntents error:", err.message);
    return [];
  }
}

export async function getAllActiveGroups() {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account  = await server.getAccount(agentKeypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee:        BASE_FEE,
      networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
    })
      .addOperation(contract.call("get_all_active_groups"))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (!result.result) return [];

    const raw = scValToNative(result.result.retval);
    return Array.isArray(raw) ? raw.map(Number) : [];
  } catch (err) {
    console.error("[Contract] getAllActiveGroups error:", err.message);
    return [];
  }
}

export async function getGroup(groupId) {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account  = await server.getAccount(agentKeypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee:        BASE_FEE,
      networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
    })
      .addOperation(contract.call("get_group", nativeToScVal(groupId, { type: "u64" })))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (!result.result) return null;

    return scValToNative(result.result.retval);
  } catch (err) {
    console.error(`[Contract] getGroup(${groupId}) error:`, err.message);
    return null;
  }
}

export async function getGroupMembers(groupId) {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account  = await server.getAccount(agentKeypair.publicKey());

    const tx = new TransactionBuilder(account, {
      fee:        BASE_FEE,
      networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
    })
      .addOperation(contract.call("get_group_members", nativeToScVal(groupId, { type: "u64" })))
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (!result.result) return [];

    const raw = scValToNative(result.result.retval);
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error(`[Contract] getGroupMembers(${groupId}) error:`, err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write Functions — agent signs and submits transactions
// ─────────────────────────────────────────────────────────────────────────────

async function invokeContract(functionName, ...args) {
  const contract = new Contract(CONTRACT_ID);
  const account  = await server.getAccount(agentKeypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee:        BASE_FEE,
    networkPassphrase: process.env.NETWORK_PASSPHRASE || Networks.TESTNET,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  // Simulate first to get the authorisation footprint
  const simResult = await server.simulateTransaction(tx);
  if (simResult.error) throw new Error(`Simulation failed: ${simResult.error}`);

  // Assemble the transaction with the simulation result
  const { SorobanRpc } = await import("@stellar/stellar-sdk");
  const assembled = SorobanRpc.assembleTransaction(tx, simResult).build();
  assembled.sign(agentKeypair);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(sendResult.hash);
  let attempts  = 0;

  while (getResult.status === "NOT_FOUND" && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  if (getResult.status !== "SUCCESS") {
    throw new Error(`Transaction not confirmed. Status: ${getResult.status}`);
  }

  return sendResult.hash;
}

export async function createGroup(memberWallets, contributionAmount, roundDuration) {
  const walletsScVal = xdr.ScVal.scvVec(
    memberWallets.map((w) => new Address(w).toScVal())
  );

  return invokeContract(
    "create_group",
    walletsScVal,
    nativeToScVal(BigInt(contributionAmount), { type: "i128" }),
    nativeToScVal(BigInt(roundDuration),      { type: "u64" }),
  );
}

export async function advanceRound(groupId, winnerAddress) {
  return invokeContract(
    "advance_round",
    nativeToScVal(groupId,       { type: "u64" }),
    new Address(winnerAddress).toScVal(),
  );
}

export async function handleDefault(groupId, defaulterAddress, winnerAddress, reason) {
  const { nativeToScVal: n } = await import("@stellar/stellar-sdk");
  return invokeContract(
    "handle_default",
    nativeToScVal(groupId,          { type: "u64" }),
    new Address(defaulterAddress).toScVal(),
    new Address(winnerAddress).toScVal(),
    nativeToScVal(reason,           { type: "string" }),
  );
}

export async function markDeployed(groupId) {
  return invokeContract(
    "mark_deployed",
    nativeToScVal(groupId, { type: "u64" }),
  );
}

export async function markWithdrawn(groupId, yieldAmount) {
  return invokeContract(
    "mark_withdrawn",
    nativeToScVal(groupId,          { type: "u64" }),
    nativeToScVal(BigInt(yieldAmount), { type: "i128" }),
  );
}

export async function updateCreditScore(groupId, wallet, newScore) {
  return invokeContract(
    "update_credit_score",
    nativeToScVal(groupId,   { type: "u64" }),
    new Address(wallet).toScVal(),
    nativeToScVal(newScore,  { type: "u32" }),
  );
}
