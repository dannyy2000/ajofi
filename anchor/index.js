/**
 * AjoFi Demo Anchor — SEP-24 Interactive Deposit & Withdrawal
 *
 * Simulates a West African fiat anchor (like Yellow Card in production).
 * Supports NGN (Nigeria) and GHS (Ghana) → USDC on Stellar testnet.
 *
 * SEP-24 Flow:
 * 1. Wallet calls GET /info         → discovers supported assets + currencies
 * 2. Wallet calls POST /transactions/deposit/interactive  → gets a URL
 * 3. Wallet opens that URL in iframe → user fills NGN/GHS amount
 * 4. User clicks Pay → anchor mints USDC to their Stellar wallet
 * 5. Wallet polls GET /transaction?id=  → confirms completion
 */

import "dotenv/config";
import express    from "express";
import cors       from "cors";
import { v4 as uuidv4 } from "uuid";
import sdk        from "@stellar/stellar-sdk";

const {
  Keypair,
  Asset,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Operation,
  rpc,
  nativeToScVal,
  Address,
  Contract,
  Horizon,
} = sdk;

const app  = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT             = process.env.PORT             || 3001;
const ANCHOR_SECRET    = process.env.AGENT_SECRET_KEY;          // anchor pays fees
const USDC_CONTRACT    = process.env.USDC_ASSET_ID;             // our test USDC
const NETWORK_PASS     = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;
const RPC_URL          = process.env.SOROBAN_RPC_URL   || "https://soroban-testnet.stellar.org";
const ANCHOR_BASE_URL  = process.env.ANCHOR_BASE_URL   || `http://localhost:${PORT}`;

const anchorKeypair  = Keypair.fromSecret(ANCHOR_SECRET);
const server         = new rpc.Server(RPC_URL);
const horizonServer  = new Horizon.Server("https://horizon-testnet.stellar.org");

// Classic asset: TUSDC issued by anchor keypair
const TUSDC_ASSET = new Asset("TUSDC", anchorKeypair.publicKey());

// Exchange rates: how many local currency units per 1 USDC
// These are approximate real-world rates
const RATES = {
  NGN: { name: "Nigerian Naira",   flag: "🇳🇬", rate: 1580, min: 500,   max: 5_000_000  },
  GHS: { name: "Ghanaian Cedi",    flag: "🇬🇭", rate: 13.5, min: 10,    max: 50_000     },
};

// In-memory transaction store (use a DB in production)
const transactions = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function usdcFromLocal(amount, currency) {
  return (amount / RATES[currency].rate).toFixed(7);
}

function localFromUsdc(usdcAmount, currency) {
  return (usdcAmount * RATES[currency].rate).toFixed(2);
}

async function ensureTrustline(destinationWallet) {
  /**
   * Check if the destination wallet has a trustline to TUSDC.
   * If not, this is a no-op — the user needs to add it from their wallet.
   * In the demo UI we instruct them to do this first.
   */
  try {
    const account = await horizonServer.loadAccount(destinationWallet);
    const hasTrustline = account.balances.some(
      (b) => b.asset_code === "TUSDC" && b.asset_issuer === anchorKeypair.publicKey()
    );
    return hasTrustline;
  } catch {
    return false;
  }
}

async function mintUsdcToWallet(destinationWallet, usdcAmount) {
  /**
   * Mint TUSDC to a user's wallet via classic Stellar payment.
   * The anchor keypair is the issuer — issuer payments create new tokens.
   * The destination must have a trustline to TUSDC:ISSUER.
   */
  const hasTrustline = await ensureTrustline(destinationWallet);
  if (!hasTrustline) {
    throw new Error(
      `Wallet has no trustline to TUSDC. Please add TUSDC (issuer: ${anchorKeypair.publicKey()}) to your wallet first.`
    );
  }

  const account = await horizonServer.loadAccount(anchorKeypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee:               BASE_FEE,
    networkPassphrase: NETWORK_PASS,
  })
    .addOperation(
      Operation.payment({
        destination: destinationWallet,
        asset:       TUSDC_ASSET,
        amount:      usdcAmount.toFixed(7),
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(anchorKeypair);

  const result = await horizonServer.submitTransaction(tx);
  return result.hash;
}

// ─── SEP-10 stub — wallet auth (simplified for demo) ─────────────────────────

app.get("/auth", (req, res) => {
  // Full SEP-10 requires challenge/response signing — simplified for demo
  const { account } = req.query;
  if (!account) return res.status(400).json({ error: "account required" });
  // Return a demo JWT-like token (not cryptographically verified in demo)
  const token = Buffer.from(JSON.stringify({ account, iat: Date.now() })).toString("base64");
  res.json({ token });
});

app.post("/auth", (req, res) => {
  // In production: verify the signed challenge transaction
  // For demo: just return a token
  const { transaction } = req.body;
  if (!transaction) return res.status(400).json({ error: "transaction required" });
  const token = Buffer.from(JSON.stringify({ verified: true, iat: Date.now() })).toString("base64");
  res.json({ token });
});

// ─── Stellar TOML ─────────────────────────────────────────────────────────────

app.get("/.well-known/stellar.toml", (req, res) => {
  res.type("text/plain");
  res.send(`
NETWORK_PASSPHRASE="${NETWORK_PASS}"
ACCOUNTS=["${anchorKeypair.publicKey()}"]
VERSION="0.1.0"
SIGNING_KEY="${anchorKeypair.publicKey()}"

WEB_AUTH_ENDPOINT="${ANCHOR_BASE_URL}/auth"
TRANSFER_SERVER_SEP0024="${ANCHOR_BASE_URL}"

[[CURRENCIES]]
code="TUSDC"
issuer="${anchorKeypair.publicKey()}"
display_decimals=2
name="AjoFi Test USD"
desc="Testnet USD used for AjoFi demo. Backed 1:1 in production by Circle USDC."
is_asset_anchored=true
anchor_asset_type="fiat"
anchor_asset="USD"
status="test"
`);
});

// ─── SEP-24: GET /info ────────────────────────────────────────────────────────

app.get("/info", (req, res) => {
  res.json({
    deposit: {
      TUSDC: {
        enabled:          true,
        authentication_required: false,
        min_amount:       1,
        max_amount:       10000,
        fee_fixed:        0,
        fee_percent:      1,
        fields: {
          currency: {
            description: "Local currency to deposit from",
            choices:     ["NGN", "GHS"],
          },
        },
      },
    },
    withdraw: {
      TUSDC: {
        enabled:          true,
        authentication_required: false,
        min_amount:       1,
        max_amount:       10000,
        fee_fixed:        0,
        fee_percent:      1,
        fields: {
          currency: {
            description: "Local currency to receive",
            choices:     ["NGN", "GHS"],
          },
          dest: {
            description: "Bank account number or mobile money number",
          },
        },
      },
    },
    fee:          { enabled: false },
    transactions: { enabled: true },
    transaction:  { enabled: true },
  });
});

// ─── SEP-24: POST /transactions/deposit/interactive ───────────────────────────

app.post("/transactions/deposit/interactive", (req, res) => {
  const { account, asset_code } = req.body;
  if (!account) return res.status(400).json({ error: "account required" });

  const txId = uuidv4();
  transactions.set(txId, {
    id:          txId,
    kind:        "deposit",
    status:      "incomplete",
    asset_code:  asset_code || "TUSDC",
    account,
    created_at:  new Date().toISOString(),
  });

  res.json({
    type:          "interactive_customer_info_needed",
    url:           `${ANCHOR_BASE_URL}/deposit?id=${txId}&account=${account}`,
    id:            txId,
  });
});

// ─── SEP-24: POST /transactions/withdraw/interactive ─────────────────────────

app.post("/transactions/withdraw/interactive", (req, res) => {
  const { account, asset_code } = req.body;
  if (!account) return res.status(400).json({ error: "account required" });

  const txId = uuidv4();
  transactions.set(txId, {
    id:          txId,
    kind:        "withdraw",
    status:      "incomplete",
    asset_code:  asset_code || "TUSDC",
    account,
    created_at:  new Date().toISOString(),
  });

  res.json({
    type:          "interactive_customer_info_needed",
    url:           `${ANCHOR_BASE_URL}/withdraw?id=${txId}&account=${account}`,
    id:            txId,
  });
});

// ─── SEP-24: GET /transaction ─────────────────────────────────────────────────

app.get("/transaction", (req, res) => {
  const { id } = req.query;
  const tx = transactions.get(id);
  if (!tx) return res.status(404).json({ error: "transaction not found" });
  res.json({ transaction: tx });
});

app.get("/transactions", (req, res) => {
  const { account } = req.query;
  const all = [...transactions.values()].filter((t) => !account || t.account === account);
  res.json({ transactions: all });
});

// ─── Deposit UI ───────────────────────────────────────────────────────────────

app.get("/deposit", (req, res) => {
  const { id, account } = req.query;
  res.send(depositPage(id, account));
});

app.post("/deposit/confirm", async (req, res) => {
  const { id, account, currency, local_amount } = req.body;
  const tx = transactions.get(id);
  if (!tx) return res.status(404).send("Transaction not found");

  const usdcAmount  = parseFloat(usdcFromLocal(parseFloat(local_amount), currency));
  const rate        = RATES[currency];

  // Update transaction to pending
  tx.status          = "pending_external";
  tx.amount_in       = `${local_amount} ${currency}`;
  tx.amount_out      = `${usdcAmount} TUSDC`;
  tx.amount_fee      = `${(usdcAmount * 0.01).toFixed(7)} TUSDC`;
  tx.currency        = currency;
  transactions.set(id, tx);

  try {
    // Mint USDC to the user's wallet
    const txHash = await mintUsdcToWallet(account, usdcAmount);

    tx.status          = "completed";
    tx.stellar_transaction_id = txHash;
    tx.completed_at    = new Date().toISOString();
    transactions.set(id, tx);

    res.send(successPage(currency, local_amount, usdcAmount, txHash, rate));
  } catch (err) {
    console.error("[Anchor] Mint error:", err.message);
    tx.status         = "error";
    tx.message        = err.message;
    transactions.set(id, tx);
    res.send(errorPage(err.message));
  }
});

// ─── Withdraw UI ─────────────────────────────────────────────────────────────

app.get("/withdraw", (req, res) => {
  const { id, account } = req.query;
  res.send(withdrawPage(id, account));
});

app.post("/withdraw/confirm", async (req, res) => {
  const { id, account, currency, usdc_amount, dest } = req.body;
  const tx = transactions.get(id);
  if (!tx) return res.status(404).send("Transaction not found");

  const localAmount = parseFloat(localFromUsdc(parseFloat(usdc_amount), currency));
  const rate        = RATES[currency];

  tx.status         = "completed";
  tx.amount_in      = `${usdc_amount} TUSDC`;
  tx.amount_out     = `${localAmount} ${currency}`;
  tx.amount_fee     = `${(parseFloat(usdc_amount) * 0.01).toFixed(7)} TUSDC`;
  tx.dest           = dest;
  tx.completed_at   = new Date().toISOString();
  transactions.set(id, tx);

  // In production: trigger Yellow Card payout to bank/mobile money
  // For demo: simulate success
  res.send(withdrawSuccessPage(currency, usdc_amount, localAmount, dest, rate));
});

// ─── HTML Pages ───────────────────────────────────────────────────────────────

function depositPage(id, account) {
  const shortAccount = `${account?.slice(0,4)}...${account?.slice(-4)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AjoFi — Deposit</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f0f; color: #fff; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px;
            padding: 32px; width: 100%; max-width: 420px; }
    .logo { font-size: 24px; font-weight: 700; color: #7c3aed; margin-bottom: 8px; }
    .subtitle { color: #888; font-size: 14px; margin-bottom: 28px; }
    label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; margin-top: 16px; }
    select, input { width: 100%; padding: 12px 14px; background: #111; border: 1px solid #333;
                    border-radius: 10px; color: #fff; font-size: 15px; outline: none; }
    select:focus, input:focus { border-color: #7c3aed; }
    .rate-display { background: #111; border: 1px solid #222; border-radius: 10px;
                    padding: 14px; margin-top: 16px; }
    .rate-row { display: flex; justify-content: space-between; font-size: 14px; color: #aaa; }
    .rate-usdc { font-size: 22px; font-weight: 700; color: #7c3aed; margin-top: 4px; }
    .btn { width: 100%; padding: 14px; background: #7c3aed; color: #fff; border: none;
           border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 24px; }
    .btn:hover { background: #6d28d9; }
    .wallet-tag { font-size: 12px; color: #555; margin-top: 16px; text-align: center; }
    .flag { font-size: 20px; }
    .currency-row { display: flex; gap: 10px; margin-top: 16px; }
    .currency-opt { flex: 1; padding: 14px; background: #111; border: 2px solid #333;
                    border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .currency-opt.selected { border-color: #7c3aed; background: #1e1030; }
    .currency-opt .flag { display: block; margin-bottom: 4px; }
    .currency-opt .code { font-weight: 700; font-size: 15px; }
    .currency-opt .name { font-size: 11px; color: #888; }
    .testnet-badge { display: inline-block; background: #1a1a00; border: 1px solid #444400;
                     color: #aaaa00; font-size: 11px; padding: 3px 8px; border-radius: 6px;
                     margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">AjoFi</div>
    <div class="subtitle">Deposit to your savings wallet</div>
    <span class="testnet-badge">Testnet Demo</span>

    <form method="POST" action="/deposit/confirm" id="depositForm">
      <input type="hidden" name="id" value="${id}" />
      <input type="hidden" name="account" value="${account}" />
      <input type="hidden" name="currency" id="currencyInput" value="NGN" />

      <label>Select your country</label>
      <div class="currency-row">
        <div class="currency-opt selected" onclick="selectCurrency('NGN', this)">
          <span class="flag">🇳🇬</span>
          <span class="code">NGN</span>
          <span class="name">Nigeria</span>
        </div>
        <div class="currency-opt" onclick="selectCurrency('GHS', this)">
          <span class="flag">🇬🇭</span>
          <span class="code">GHS</span>
          <span class="name">Ghana</span>
        </div>
      </div>

      <label>Amount to deposit</label>
      <input type="number" name="local_amount" id="localAmount"
             placeholder="e.g. 50,000" min="500" required
             oninput="updateRate()" />

      <div class="rate-display">
        <div class="rate-row">
          <span>You receive</span>
          <span id="rateLabel">Rate: 1 USDC = 1,580 NGN</span>
        </div>
        <div class="rate-usdc" id="usdcDisplay">0.0000000 USDC</div>
      </div>

      <button type="submit" class="btn">Pay with Bank Transfer</button>
    </form>

    <div class="wallet-tag">Depositing to ${shortAccount}</div>
  </div>

  <script>
    const RATES = { NGN: 1580, GHS: 13.5 };
    let currentCurrency = 'NGN';

    function selectCurrency(code, el) {
      currentCurrency = code;
      document.getElementById('currencyInput').value = code;
      document.querySelectorAll('.currency-opt').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      updateRate();
    }

    function updateRate() {
      const amount = parseFloat(document.getElementById('localAmount').value) || 0;
      const rate   = RATES[currentCurrency];
      const usdc   = (amount / rate).toFixed(7);
      document.getElementById('usdcDisplay').textContent = usdc + ' USDC';
      document.getElementById('rateLabel').textContent =
        'Rate: 1 USDC = ' + rate.toLocaleString() + ' ' + currentCurrency;
    }
  </script>
</body>
</html>`;
}

function successPage(currency, localAmount, usdcAmount, txHash, rate) {
  const shortHash = `${txHash.slice(0,8)}...${txHash.slice(-8)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AjoFi — Deposit Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f0f; color: #fff; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px;
            padding: 32px; width: 100%; max-width: 420px; text-align: center; }
    .check { font-size: 56px; margin-bottom: 16px; }
    h2 { font-size: 22px; margin-bottom: 8px; }
    .amount { font-size: 36px; font-weight: 800; color: #7c3aed; margin: 16px 0; }
    .sub { color: #888; font-size: 14px; margin-bottom: 24px; }
    .detail { background: #111; border-radius: 10px; padding: 16px; margin-bottom: 16px; text-align: left; }
    .detail-row { display: flex; justify-content: space-between; font-size: 13px;
                  padding: 6px 0; border-bottom: 1px solid #1e1e1e; color: #aaa; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span:last-child { color: #fff; }
    .hash { font-family: monospace; font-size: 11px; word-break: break-all; color: #7c3aed; }
    .close-btn { display: block; width: 100%; padding: 14px; background: #7c3aed; color: #fff;
                 border: none; border-radius: 10px; font-size: 16px; font-weight: 600;
                 cursor: pointer; text-decoration: none; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✅</div>
    <h2>Deposit Successful</h2>
    <div class="amount">${usdcAmount} USDC</div>
    <p class="sub">Your USDC is now in your Stellar wallet and ready to use in AjoFi</p>

    <div class="detail">
      <div class="detail-row"><span>You paid</span><span>${parseFloat(localAmount).toLocaleString()} ${currency}</span></div>
      <div class="detail-row"><span>You received</span><span>${usdcAmount} USDC</span></div>
      <div class="detail-row"><span>Rate</span><span>1 USDC = ${rate.rate.toLocaleString()} ${currency}</span></div>
      <div class="detail-row"><span>Fee</span><span>1% (${(usdcAmount * 0.01).toFixed(4)} USDC)</span></div>
      <div class="detail-row"><span>Stellar TX</span><span class="hash">${shortHash}</span></div>
    </div>

    <button class="close-btn" onclick="window.close ? window.close() : history.back()">
      Return to AjoFi
    </button>
  </div>
</body>
</html>`;
}

function withdrawPage(id, account) {
  const shortAccount = `${account?.slice(0,4)}...${account?.slice(-4)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AjoFi — Withdraw</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f0f; color: #fff; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px;
            padding: 32px; width: 100%; max-width: 420px; }
    .logo { font-size: 24px; font-weight: 700; color: #7c3aed; margin-bottom: 8px; }
    .subtitle { color: #888; font-size: 14px; margin-bottom: 28px; }
    label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; margin-top: 16px; }
    select, input { width: 100%; padding: 12px 14px; background: #111; border: 1px solid #333;
                    border-radius: 10px; color: #fff; font-size: 15px; outline: none; }
    select:focus, input:focus { border-color: #7c3aed; }
    .rate-display { background: #111; border: 1px solid #222; border-radius: 10px;
                    padding: 14px; margin-top: 16px; }
    .rate-row { display: flex; justify-content: space-between; font-size: 14px; color: #aaa; }
    .rate-local { font-size: 22px; font-weight: 700; color: #10b981; margin-top: 4px; }
    .btn { width: 100%; padding: 14px; background: #10b981; color: #fff; border: none;
           border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 24px; }
    .btn:hover { background: #059669; }
    .wallet-tag { font-size: 12px; color: #555; margin-top: 16px; text-align: center; }
    .currency-row { display: flex; gap: 10px; margin-top: 16px; }
    .currency-opt { flex: 1; padding: 14px; background: #111; border: 2px solid #333;
                    border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .currency-opt.selected { border-color: #10b981; background: #0a2018; }
    .currency-opt .flag { display: block; margin-bottom: 4px; font-size: 20px; }
    .currency-opt .code { font-weight: 700; font-size: 15px; }
    .currency-opt .name { font-size: 11px; color: #888; }
    .testnet-badge { display: inline-block; background: #1a1a00; border: 1px solid #444400;
                     color: #aaaa00; font-size: 11px; padding: 3px 8px; border-radius: 6px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">AjoFi</div>
    <div class="subtitle">Withdraw your savings to local currency</div>
    <span class="testnet-badge">Testnet Demo</span>

    <form method="POST" action="/withdraw/confirm" id="withdrawForm">
      <input type="hidden" name="id" value="${id}" />
      <input type="hidden" name="account" value="${account}" />
      <input type="hidden" name="currency" id="currencyInput" value="NGN" />

      <label>Receive in</label>
      <div class="currency-row">
        <div class="currency-opt selected" onclick="selectCurrency('NGN', this)">
          <span class="flag">🇳🇬</span>
          <span class="code">NGN</span>
          <span class="name">Nigeria</span>
        </div>
        <div class="currency-opt" onclick="selectCurrency('GHS', this)">
          <span class="flag">🇬🇭</span>
          <span class="code">GHS</span>
          <span class="name">Ghana</span>
        </div>
      </div>

      <label>USDC amount to withdraw</label>
      <input type="number" name="usdc_amount" id="usdcAmount"
             placeholder="e.g. 50" min="1" step="0.0000001" required
             oninput="updateRate()" />

      <div class="rate-display">
        <div class="rate-row">
          <span>You receive</span>
          <span id="rateLabel">Rate: 1 USDC = 1,580 NGN</span>
        </div>
        <div class="rate-local" id="localDisplay">0.00 NGN</div>
      </div>

      <label>Bank account / Mobile money number</label>
      <input type="text" name="dest" placeholder="0801234567 or account number" required />

      <button type="submit" class="btn">Withdraw to Bank</button>
    </form>

    <div class="wallet-tag">Withdrawing from ${shortAccount}</div>
  </div>

  <script>
    const RATES = { NGN: 1580, GHS: 13.5 };
    let currentCurrency = 'NGN';

    function selectCurrency(code, el) {
      currentCurrency = code;
      document.getElementById('currencyInput').value = code;
      document.querySelectorAll('.currency-opt').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      updateRate();
    }

    function updateRate() {
      const amount = parseFloat(document.getElementById('usdcAmount').value) || 0;
      const rate   = RATES[currentCurrency];
      const local  = (amount * rate).toFixed(2);
      document.getElementById('localDisplay').textContent =
        parseFloat(local).toLocaleString() + ' ' + currentCurrency;
      document.getElementById('rateLabel').textContent =
        'Rate: 1 USDC = ' + rate.toLocaleString() + ' ' + currentCurrency;
    }
  </script>
</body>
</html>`;
}

function withdrawSuccessPage(currency, usdcAmount, localAmount, dest, rate) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AjoFi — Withdrawal Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f0f; color: #fff; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px;
            padding: 32px; width: 100%; max-width: 420px; text-align: center; }
    .check { font-size: 56px; margin-bottom: 16px; }
    h2 { font-size: 22px; margin-bottom: 8px; }
    .amount { font-size: 36px; font-weight: 800; color: #10b981; margin: 16px 0; }
    .sub { color: #888; font-size: 14px; margin-bottom: 24px; }
    .detail { background: #111; border-radius: 10px; padding: 16px; margin-bottom: 16px; text-align: left; }
    .detail-row { display: flex; justify-content: space-between; font-size: 13px;
                  padding: 6px 0; border-bottom: 1px solid #1e1e1e; color: #aaa; }
    .detail-row:last-child { border-bottom: none; }
    .detail-row span:last-child { color: #fff; }
    .close-btn { display: block; width: 100%; padding: 14px; background: #10b981; color: #fff;
                 border: none; border-radius: 10px; font-size: 16px; font-weight: 600;
                 cursor: pointer; text-decoration: none; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✅</div>
    <h2>Withdrawal Initiated</h2>
    <div class="amount">${parseFloat(localAmount).toLocaleString()} ${currency}</div>
    <p class="sub">Your funds are on the way to your bank account</p>

    <div class="detail">
      <div class="detail-row"><span>You sent</span><span>${usdcAmount} USDC</span></div>
      <div class="detail-row"><span>You receive</span><span>${parseFloat(localAmount).toLocaleString()} ${currency}</span></div>
      <div class="detail-row"><span>Rate</span><span>1 USDC = ${rate.rate.toLocaleString()} ${currency}</span></div>
      <div class="detail-row"><span>Destination</span><span>${dest}</span></div>
      <div class="detail-row"><span>Est. arrival</span><span>Instant (testnet)</span></div>
    </div>

    <button class="close-btn" onclick="window.close ? window.close() : history.back()">
      Return to AjoFi
    </button>
  </div>
</body>
</html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html><head><title>Error</title>
<style>body{background:#0f0f0f;color:#fff;font-family:sans-serif;display:flex;
align-items:center;justify-content:center;min-height:100vh;}
.card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:32px;max-width:400px;text-align:center;}
.icon{font-size:48px;margin-bottom:16px;} h2{color:#ef4444;} p{color:#888;margin-top:8px;font-size:14px;}</style>
</head><body><div class="card">
<div class="icon">❌</div>
<h2>Something went wrong</h2>
<p>${message}</p>
<button onclick="history.back()" style="margin-top:20px;padding:12px 24px;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;">Go back</button>
</div></body></html>`;
}

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nAjoFi Demo Anchor running on port ${PORT}`);
  console.log(`Anchor public key: ${anchorKeypair.publicKey()}`);
  console.log(`TUSDC contract:    ${USDC_CONTRACT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /.well-known/stellar.toml`);
  console.log(`  GET  /info`);
  console.log(`  POST /transactions/deposit/interactive`);
  console.log(`  POST /transactions/withdraw/interactive`);
  console.log(`  GET  /transaction?id=`);
  console.log(`  GET  /deposit?id=&account=    (UI)`);
  console.log(`  GET  /withdraw?id=&account=   (UI)\n`);
});
