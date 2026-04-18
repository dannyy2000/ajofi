"use client";
/**
 * AjoFi Stellar / Soroban contract helpers
 *
 * All contract reads use simulation (no signature needed).
 * All contract writes build, simulate, sign via SWK, submit and poll — all
 * within a single dynamic import so the same XDR class instances are used
 * throughout. Passing xdr.ScVal objects across separate dynamic imports causes
 * "Bad union switch" errors.
 *
 * GroupStatus: 0 = Forming, 1 = Active, 2 = Completed
 * FundStatus:  0 = Idle,    1 = Deployed
 */

const CONTRACT_ID  = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const RPC_URL      = "https://soroban-testnet.stellar.org";
const NETWORK_PASS = "Test SDF Network ; September 2015";

export const STROOP = 10_000_000; // 1 USDC = 10_000_000 (7-decimal token)

export interface Group {
  id:                  number;
  contribution_amount: bigint;
  collateral_amount:   bigint;
  total_members:       number;
  current_round:       number;
  paid_count:          number;
  round_deadline:      number;
  round_duration:      number;
  status:              number;   // 0 Forming | 1 Active | 2 Completed
  fund_status:         number;   // 0 Idle | 1 Deployed
  yield_earned:        bigint;
  member_addresses:    string[];
}

export interface Member {
  wallet:              string;
  has_paid:            boolean;
  has_collateral:      boolean;
  has_received_payout: boolean;
  credit_score:        number;
  default_count:       number;
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

async function simulateRead(fnName: string, scArgs: unknown[]) {
  const sdk = await import("@stellar/stellar-sdk");
  const { Contract, TransactionBuilder, BASE_FEE, Networks, nativeToScVal,
          scValToNative, rpc, Address, Account, Keypair } = sdk;

  const server   = new rpc.Server(RPC_URL);
  const contract = new Contract(CONTRACT_ID);
  const dummy    = Keypair.random();
  const account  = new Account(dummy.publicKey(), "0");

  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .addOperation(contract.call(fnName, ...(scArgs as any[])))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!("result" in sim) || !sim.result) return null;
  return scValToNative(sim.result.retval);
}

export interface Intent {
  wallet:              string;
  contribution_amount: bigint;
  desired_group_size:  number;
  round_duration:      number;
  matched:             boolean;
}

export async function getMyIntent(wallet: string): Promise<Intent | null> {
  try {
    const sdk = await import("@stellar/stellar-sdk");
    const { nativeToScVal } = sdk;
    // get_all_intents returns all intents; filter for this wallet
    const raw = await simulateRead("get_all_intents", []);
    if (!Array.isArray(raw)) return null;
    const mine = raw.find((i) => String(i.wallet) === wallet);
    if (!mine) return null;
    return {
      wallet:              String(mine.wallet),
      contribution_amount: BigInt(mine.contribution_amount ?? 0),
      desired_group_size:  Number(mine.desired_group_size),
      round_duration:      Number(mine.round_duration),
      matched:             Boolean(mine.matched),
    };
  } catch { return null; }
}

export async function getMemberGroups(wallet: string): Promise<number[]> {
  try {
    const sdk = await import("@stellar/stellar-sdk");
    const { Address } = sdk;
    const raw = await simulateRead("get_member_groups", [new Address(wallet).toScVal()]);
    if (Array.isArray(raw) && raw.length > 0) return raw.map(Number);

    // Fallback: scan group IDs 1–30 and check member_addresses.
    // Catches completed groups that the contract index may have dropped.
    const { nativeToScVal } = sdk;
    const found: number[] = [];
    for (let id = 1; id <= 30; id++) {
      try {
        const g = await simulateRead("get_group", [nativeToScVal(BigInt(id), { type: "u64" })]);
        if (!g) break; // no more groups
        const addrs: string[] = (g.member_addresses ?? []).map(String);
        if (addrs.some((a) => a === wallet)) found.push(id);
      } catch { break; }
    }
    return found;
  } catch { return []; }
}

// Soroban #[contracttype] enums serialize via scValToNative as objects:
// e.g. GroupStatus::Forming → { Forming: null }, GroupStatus::Active → { Active: null }
// Number({ Forming: null }) === NaN, so we need explicit mapping.
// Soroban #[contracttype] enums can come back as a number, a plain string,
// or a single-key object depending on the SDK version / XDR path.
// e.g. GroupStatus::Active → 1, "Active", or { Active: null }
// scValToNative returns Soroban #[contracttype] enums as single-element arrays,
// e.g. GroupStatus::Active → ["Active"], FundStatus::Idle → ["Idle"]
function parseGroupStatus(raw: unknown): number {
  const key = Array.isArray(raw) ? raw[0]
    : typeof raw === "string"    ? raw
    : raw && typeof raw === "object" ? Object.keys(raw as object)[0]
    : null;
  if (key === "Forming")   return 0;
  if (key === "Active")    return 1;
  if (key === "Completed") return 2;
  if (typeof raw === "number") return raw;
  return 0;
}
function parseFundStatus(raw: unknown): number {
  const key = Array.isArray(raw) ? raw[0]
    : typeof raw === "string"    ? raw
    : raw && typeof raw === "object" ? Object.keys(raw as object)[0]
    : null;
  if (key === "Idle")     return 0;
  if (key === "Deployed") return 1;
  if (typeof raw === "number") return raw;
  return 0;
}

export async function getGroup(groupId: number): Promise<Group | null> {
  try {
    const sdk = await import("@stellar/stellar-sdk");
    const { nativeToScVal } = sdk;
    const raw = await simulateRead("get_group", [nativeToScVal(BigInt(groupId), { type: "u64" })]);
    if (!raw) return null;
    return {
      id:                  Number(raw.id),
      contribution_amount: BigInt(raw.contribution_amount ?? 0),
      collateral_amount:   BigInt(raw.collateral_amount ?? 0),
      total_members:       Number(raw.total_members),
      current_round:       Number(raw.current_round),
      paid_count:          Number(raw.paid_count),
      round_deadline:      Number(raw.round_deadline),
      round_duration:      Number(raw.round_duration),
      status:              parseGroupStatus(raw.status),
      fund_status:         parseFundStatus(raw.fund_status),
      yield_earned:        BigInt(raw.yield_earned ?? 0),
      member_addresses:    (raw.member_addresses ?? []).map(String),
    };
  } catch { return null; }
}

export async function getGroupMembers(groupId: number): Promise<Member[]> {
  try {
    const sdk = await import("@stellar/stellar-sdk");
    const { nativeToScVal } = sdk;
    const raw = await simulateRead("get_group_members", [nativeToScVal(BigInt(groupId), { type: "u64" })]);
    if (!Array.isArray(raw)) return [];
    return raw.map((m) => ({
      wallet:              String(m.wallet),
      has_paid:            Boolean(m.has_paid),
      has_collateral:      Boolean(m.has_collateral),
      has_received_payout: Boolean(m.has_received_payout),
      credit_score:        Number(m.credit_score),
      default_count:       Number(m.default_count),
    }));
  } catch { return []; }
}

// ─── Write helpers ────────────────────────────────────────────────────────────
// Each write function imports SDK once and builds everything in one scope
// to avoid "Bad union switch" XDR errors from mismatched class instances.

async function signAndSubmit(walletAddress: string, buildArgs: {
  fnName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  makeArgs: (sdk: any) => any[];
}): Promise<string> {
  const sdk = await import("@stellar/stellar-sdk");
  const { Contract, TransactionBuilder, BASE_FEE, Networks, rpc, Horizon, Account } = sdk;

  // Re-init SWK with modules and restore the wallet the user chose on /app.
  // StellarWalletsKit is a static class — calling init() again is safe and
  // ensures the module list is present even if this is the first import on
  // this page. setWallet() tells it which signer to use for signTransaction().
  const swkPkg = await import("@creit.tech/stellar-wallets-kit");
  const { FreighterModule } = await import("@creit.tech/stellar-wallets-kit/modules/freighter");
  const { LobstrModule }    = await import("@creit.tech/stellar-wallets-kit/modules/lobstr");
  const { AlbedoModule }    = await import("@creit.tech/stellar-wallets-kit/modules/albedo");
  const { StellarWalletsKit } = swkPkg;

  StellarWalletsKit.init({
    network:  swkPkg.Networks.TESTNET,
    modules:  [new FreighterModule(), new LobstrModule(), new AlbedoModule()],
  });

  const walletId = typeof window !== "undefined" ? localStorage.getItem("ajofi_wallet_id") : null;
  if (walletId && walletId !== "undefined") StellarWalletsKit.setWallet(walletId);

  const server        = new rpc.Server(RPC_URL);
  const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");
  const contract      = new Contract(CONTRACT_ID);
  const accData       = await horizonServer.loadAccount(walletAddress);
  const account       = new Account(walletAddress, accData.sequenceNumber());
  const scArgs   = buildArgs.makeArgs(sdk);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx = new TransactionBuilder(account as any, {
    fee:               BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(buildArgs.fnName, ...scArgs))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if ("error" in sim && sim.error) throw new Error(`Simulation failed: ${sim.error}`);

  const assembled = rpc.assembleTransaction(tx, sim).build();

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(assembled.toXDR(), {
    networkPassphrase: Networks.TESTNET,
    address:           walletAddress,
  });

  // Use Transaction constructor directly — TransactionBuilder.fromXDR can cause
  // "Bad union switch" XDR errors with some wallet signers (e.g. Freighter on new accounts).
  if (!signedTxXdr) throw new Error("Wallet did not return a signed transaction. Did you approve it?");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signedTx   = new (sdk as any).Transaction(signedTxXdr, Networks.TESTNET);
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  // Poll using a raw JSON-RPC fetch — the SDK's getTransaction() tries to
  // deserialize Soroban result XDR which can fail with "Bad union switch"
  // on newer protocol versions. We only need the status string.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const resp = await fetch(RPC_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method:  "getTransaction",
        params:  { hash: sendResult.hash },
      }),
    });
    const json = await resp.json();
    const status: string = json?.result?.status ?? "NOT_FOUND";
    if (status === "SUCCESS") return sendResult.hash;
    if (status === "FAILED")  throw new Error("Transaction failed on-chain");
    // NOT_FOUND or PENDING — keep polling
  }
  throw new Error("Transaction not confirmed in time");
}

export async function registerIntent(
  wallet:        string,
  usdcAmount:    number,
  groupSize:     number,
  roundDuration: number,
): Promise<string> {
  return signAndSubmit(wallet, {
    fnName: "register_intent",
    makeArgs: ({ nativeToScVal, Address }) => [
      new Address(wallet).toScVal(),
      nativeToScVal(BigInt(Math.round(usdcAmount * STROOP)), { type: "i128" }),
      nativeToScVal(groupSize,            { type: "u32" }),
      nativeToScVal(BigInt(roundDuration), { type: "u64" }),
    ],
  });
}

export async function lockCollateral(wallet: string, groupId: number): Promise<string> {
  return signAndSubmit(wallet, {
    fnName: "lock_collateral",
    makeArgs: ({ nativeToScVal, Address }) => [
      new Address(wallet).toScVal(),
      nativeToScVal(BigInt(groupId), { type: "u64" }),
    ],
  });
}

export async function payContribution(wallet: string, groupId: number): Promise<string> {
  return signAndSubmit(wallet, {
    fnName: "pay_contribution",
    makeArgs: ({ nativeToScVal, Address }) => [
      new Address(wallet).toScVal(),
      nativeToScVal(BigInt(groupId), { type: "u64" }),
    ],
  });
}
