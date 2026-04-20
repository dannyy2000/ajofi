/**
 * AjoFi Contract Client
 * Handles all reads and writes to the Soroban vault contract.
 */

import sdk from "@stellar/stellar-sdk";
const {
  Account,
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
  rpc,
} = sdk;

import { server, horizonServer, agentKeypair } from "./stellar.js";

const CONTRACT_ID        = process.env.CONTRACT_ID;
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Load account from Horizon (always reliable) instead of Soroban RPC
async function loadAccount() {
  const acc = await horizonServer.loadAccount(agentKeypair.publicKey());
  return new Account(agentKeypair.publicKey(), acc.sequenceNumber());
}

async function simulate(functionName, ...args) {
  const contract = new Contract(CONTRACT_ID);
  const account  = await loadAccount();

  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await server.simulateTransaction(tx);
    } catch (err) {
      if (attempt === 3) throw err;
      console.warn(`[Contract] simulate ${functionName} attempt ${attempt} failed (${err.code || err.message}), retrying...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

async function invokeContract(functionName, ...args) {
  const contract = new Contract(CONTRACT_ID);
  const account  = await loadAccount();

  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (simResult.error) throw new Error(`Simulation failed: ${simResult.error}`);

  const assembled = rpc.assembleTransaction(tx, simResult).build();
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

// ─────────────────────────────────────────────────────────────────────────────
// Read Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllIntents() {
  try {
    const result = await simulate("get_all_intents");
    if (!result.result) return [];
    const raw = scValToNative(result.result.retval);
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error("[Contract] getAllIntents error:", err.code || err.message || String(err));
    return [];
  }
}

export async function getAllActiveGroups() {
  try {
    const result = await simulate("get_all_active_groups");
    if (!result.result) return [];
    const raw = scValToNative(result.result.retval);
    return Array.isArray(raw) ? raw.map(Number) : [];
  } catch (err) {
    console.error("[Contract] getAllActiveGroups error:", err.code || err.message || String(err));
    return [];
  }
}

export async function getGroup(groupId) {
  try {
    const result = await simulate("get_group", nativeToScVal(BigInt(groupId), { type: "u64" }));
    if (!result.result) return null;
    return scValToNative(result.result.retval);
  } catch (err) {
    console.error(`[Contract] getGroup(${groupId}) error:`, err.message);
    return null;
  }
}

export async function getGroupMembers(groupId) {
  try {
    const result = await simulate("get_group_members", nativeToScVal(BigInt(groupId), { type: "u64" }));
    if (!result.result) return [];
    const raw = scValToNative(result.result.retval);
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error(`[Contract] getGroupMembers(${groupId}) error:`, err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function createGroup(memberWallets, contributionAmount, roundDuration) {
  const walletsScVal = xdr.ScVal.scvVec(memberWallets.map((w) => new Address(w).toScVal()));
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
    nativeToScVal(BigInt(groupId), { type: "u64" }),
    new Address(winnerAddress).toScVal(),
  );
}

export async function handleDefault(groupId, defaulterAddress, winnerAddress, reason) {
  return invokeContract(
    "handle_default",
    nativeToScVal(BigInt(groupId),  { type: "u64" }),
    new Address(defaulterAddress).toScVal(),
    new Address(winnerAddress).toScVal(),
    nativeToScVal(reason,           { type: "string" }),
  );
}

export async function deployToBlend(groupId) {
  return invokeContract("deploy_to_blend", nativeToScVal(BigInt(groupId), { type: "u64" }));
}

export async function withdrawFromBlend(groupId) {
  return invokeContract("withdraw_from_blend", nativeToScVal(BigInt(groupId), { type: "u64" }));
}

export async function updateCreditScore(groupId, wallet, newScore) {
  return invokeContract(
    "update_credit_score",
    nativeToScVal(BigInt(groupId), { type: "u64" }),
    new Address(wallet).toScVal(),
    nativeToScVal(newScore,        { type: "u32" }),
  );
}
