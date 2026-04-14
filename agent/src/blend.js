/**
 * Blend Protocol Integration
 * Blend testnet contracts (blend-capital/blend-utils):
 * - Pool V2: CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF
 * - USDC:    CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU
 */

import sdk from "@stellar/stellar-sdk";
const {
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

import { server, agentKeypair } from "./stellar.js";

const BLEND_POOL_ID      = process.env.BLEND_POOL_ID  || "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF";
const USDC_TOKEN_ID      = process.env.USDC_ASSET_ID  || "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;

const REQUEST_TYPE_SUPPLY_COLLATERAL   = 2;
const REQUEST_TYPE_WITHDRAW_COLLATERAL = 3;

const deployedAmounts = new Map();

function buildRequestsScVal(requests) {
  // Soroban requires ScMap keys sorted lexicographically:
  // "address" < "amount" < "request_type"
  return xdr.ScVal.scvVec(
    requests.map((r) =>
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: nativeToScVal("address",      { type: "symbol" }),
          val: nativeToScVal(r.address,       { type: "string" }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal("amount",       { type: "symbol" }),
          val: nativeToScVal(BigInt(r.amount), { type: "i128" }),
        }),
        new xdr.ScMapEntry({
          key: nativeToScVal("request_type", { type: "symbol" }),
          val: nativeToScVal(r.request_type,  { type: "u32" }),
        }),
      ])
    )
  );
}

async function sendBlendTx(operation) {
  const account = await server.getAccount(agentKeypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (simResult.error) throw new Error(`Blend simulation failed: ${simResult.error}`);

  const assembled = rpc.assembleTransaction(tx, simResult).build();
  assembled.sign(agentKeypair);

  const sendResult = await server.sendTransaction(assembled);
  if (sendResult.status === "ERROR") {
    throw new Error(`Blend tx failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  let getResult = await server.getTransaction(sendResult.hash);
  let attempts  = 0;
  while (getResult.status === "NOT_FOUND" && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  return { hash: sendResult.hash, result: getResult };
}

export async function deployToBlend(groupId, amountInStroops) {
  console.log(`[Blend] Deploying ${amountInStroops} stroops for group ${groupId}`);

  const contract  = new Contract(BLEND_POOL_ID);
  const operation = contract.call(
    "submit",
    new Address(process.env.CONTRACT_ID).toScVal(),
    new Address(process.env.CONTRACT_ID).toScVal(),
    new Address(process.env.CONTRACT_ID).toScVal(),
    buildRequestsScVal([{
      request_type: REQUEST_TYPE_SUPPLY_COLLATERAL,
      address:      USDC_TOKEN_ID,
      amount:       amountInStroops,
    }]),
  );

  const { hash } = await sendBlendTx(operation);
  deployedAmounts.set(String(groupId), { amount: amountInStroops, deployedAt: Date.now(), txHash: hash });

  console.log(`[Blend] Deployed — TX: ${hash}`);
  return { success: true, txHash: hash };
}

export async function withdrawFromBlend(groupId) {
  const deployed = deployedAmounts.get(String(groupId));
  if (!deployed) {
    console.warn(`[Blend] No deployed record for group ${groupId}`);
    return { yieldEarned: 0 };
  }

  console.log(`[Blend] Withdrawing for group ${groupId}`);

  const MAX_I128  = BigInt("170141183460469231731687303715884105727");
  const contract  = new Contract(BLEND_POOL_ID);
  const operation = contract.call(
    "submit",
    new Address(process.env.CONTRACT_ID).toScVal(),
    new Address(process.env.CONTRACT_ID).toScVal(),
    new Address(process.env.CONTRACT_ID).toScVal(),
    buildRequestsScVal([{
      request_type: REQUEST_TYPE_WITHDRAW_COLLATERAL,
      address:      USDC_TOKEN_ID,
      amount:       MAX_I128,
    }]),
  );

  const { hash, result } = await sendBlendTx(operation);

  let returnedAmount = Number(deployed.amount);
  if (result?.returnValue) {
    try {
      const parsed = scValToNative(result.returnValue);
      if (typeof parsed === "bigint" || typeof parsed === "number") {
        returnedAmount = Number(parsed);
      }
    } catch { /* use fallback */ }
  }

  const yieldEarned = Math.max(0, returnedAmount - Number(deployed.amount));
  deployedAmounts.delete(String(groupId));

  console.log(`[Blend] Withdrew — yield: ${yieldEarned} stroops | TX: ${hash}`);
  return { yieldEarned, txHash: hash };
}
