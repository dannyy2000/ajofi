# AjoFi

> AI-powered trustless rotating savings protocol for West Africa, built on Stellar.

[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-blue)](https://stellar.org)
[![Powered by GPT-4o](https://img.shields.io/badge/AI-OpenAI%20GPT--4o-green)](https://openai.com)
[![Stellar WA Build Residency](https://img.shields.io/badge/Stellar%20WA-Build%20Residency%202026-green)](https://stellar.org)

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [The AI Layer](#the-ai-layer)
- [Why Stellar](#why-stellar)
- [Integrations](#integrations)
- [Business Model](#business-model)
- [Target Audience](#target-audience)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Setup](#setup)
- [Builder](#builder)

---

## The Problem

Rotating savings — called **ajo** in Nigeria, **esusu** in Yoruba, **susu** in Ghana, **tontine** in Francophone West Africa — is one of the most widely practiced financial systems on the continent. A group of people contribute a fixed amount every round, and each round one member collects the full pot. Simple. Effective. Decades old.

Over **14 million West Africans** actively participate in rotating savings groups. It is how people buy furniture, pay school fees, cover rent, start businesses, and build capital without access to formal credit. It works because of community trust — and that trust is the system's single biggest vulnerability.

Three structural problems have gone unsolved for generations:

---

### 1. Organizer Fraud

Every traditional ajo group has a human organizer — someone who collects contributions from members and is responsible for paying the round winner. That person holds everyone's money with no accountability mechanism. There is no smart contract, no escrow, no legal framework that applies. Nothing stops them from disappearing with the pot.

This is not a theoretical risk. It happens constantly. Groups that have run successfully for years collapse overnight when an organizer decides to take the money and go. Members lose months of savings with zero recourse. The community trust that enabled the group becomes the very thing that was exploited.

The deeper problem is that this attack surface cannot be closed by better vetting or stronger social ties. As long as a human holds the funds, the risk exists. The only real fix is to remove the human from the equation entirely.

---

### 2. Diaspora Exclusion

The Nigerian diaspora alone remits over **$20 billion** annually back home. Ghanaian, Senegalese, and Ivorian diaspora communities remit billions more. These are people who are deeply connected to their home communities, regularly send money, and grew up participating in ajo.

Yet they cannot join ajo groups with family and friends back home. There is no common payment rail. Sending money internationally takes days, costs 5–10% in fees, and the FX conversion creates contribution discrepancies that make group accounting a nightmare. A diaspora member in London trying to participate in a Lagos ajo group is effectively excluded by infrastructure, not by choice.

The result is that the diaspora — the most financially stable segment of the West African community — is locked out of a savings tradition they belong to.

---

### 3. Invisible Credit

A person who has made 48 consecutive on-time ajo contributions has demonstrated exactly the kind of payment discipline that defines a creditworthy borrower. They have proven they can commit to a payment schedule, maintain it under pressure, and complete a long-term financial obligation.

Banks do not see any of this. Lenders do not see it. Credit bureaus do not record it. Every payment, every round, every completed group exists only in WhatsApp chat history and the organizer's notebook. None of it translates into a credit score, a loan application, or access to financial products.

Years of faithful savings build zero formal financial identity. This is not just an inconvenience — it is a structural exclusion from the financial system. People who have proven themselves creditworthy cannot access credit because the proof was never recorded anywhere verifiable.

---

## The Solution

AjoFi removes every one of these failure points by replacing the human organizer with a Soroban smart contract and layering four autonomous AI agents on top to make the protocol intelligent, adaptive, and self-managing.

**No organizer.** The Soroban vault contract holds all funds. No individual — not AjoFi, not an admin, not a group leader — can access or move member funds. Payouts are executed automatically by the contract based on rules members agreed to when they joined. The attack surface for fraud is eliminated at the architectural level.

**No borders.** Stellar's anchor ecosystem connects real-world currencies to the protocol. Members in Nigeria send NGN. Members in Ghana send GHS. Members in Francophone West Africa send XOF. Diaspora members contribute USDC directly. Every member participates in the same group regardless of geography or local currency. From the user's perspective they send local money and receive local money — the Stellar layer is invisible.

**No idle money.** Between when members pay in and when the winner collects, the pooled funds are deployed to Blend Protocol for yield. The AI Yield Agent manages this autonomously — deploying when it is safe to do so and withdrawing before any payout deadline. Members earn on money that would otherwise do nothing.

**No invisible history.** Every contribution, every round, every completed group is recorded on Stellar and scored by the AI Credit Scorer. Members build a portable, verifiable financial identity that grows with every clean round. This score influences their collateral requirements, their matchmaking priority, and eventually their access to credit products built on top of AjoFi's data layer.

---

## How It Works

```
Member registers intent (contribution amount, group size, frequency)
              ↓
AI Matchmaking Agent scans all pending intents
Finds compatible members — same amount, size, frequency
Creates group on-chain with public reasoning log
              ↓
Members review matchmaking reasoning on group dashboard
Lock collateral to join — group activates when all seats filled
              ↓
Each round opens — members contribute via local currency
Paychant converts NGN/GHS → USDC (Nigeria, Ghana)
Afripay converts XOF → USDC (Francophone West Africa)
Diaspora members contribute USDC directly
              ↓
AI Ramp Selector queries live rates from both anchors
Routes each member's transaction through the best rate
              ↓
Soroban vault contract holds all funds
              ↓
AI Yield Agent assesses time until deadline and group risk
Deploys idle funds to Blend Protocol when safe to do so
Yield accrues — members earn on pooled contributions
              ↓
AI Default Predictor monitors unpaid members before deadline
Flags high-risk members, triggers collateral hold if needed
              ↓
Round closes — AI selects winner based on rotation and credit score
Yield Agent withdraws from Blend ahead of payout
Smart contract executes payout — contributions + yield share
              ↓
Winner receives payout via off-ramp (USDC → NGN/GHS/XOF to bank)
              ↓
AI Credit Scorer updates all member scores
Next round opens automatically
              ↓
After all members have received one payout — group completes
Collateral returned to clean members
Credit history recorded and carried into future groups
```

---

### The Group Lifecycle in Detail

**Registering Intent**

A user connects their Stellar wallet, sets three parameters — how much they want to contribute per round, what size group they want, and how frequently rounds should run (daily, weekly, monthly). This intent is recorded on-chain. The user does not need to find their own group. The AI does that.

**AI Matchmaking**

The matchmaking agent runs continuously, scanning all unmatched intents on-chain. When it finds a set of compatible intents — same contribution amount, same group size, same round frequency — it forms a group, calls `create_group` on the contract, and logs its full reasoning publicly. Members can see exactly why they were matched with each other.

This is the core UX unlock: strangers can join a group without knowing each other because the AI has evaluated compatibility and the contract enforces rules. You do not need to trust the people in your group — you need to trust the contract and the AI, both of which are transparent and auditable.

**Locking Collateral**

Once a group is formed, members see it on their dashboard. They review the group details and the AI's matchmaking reasoning. To confirm their seat they lock a security deposit — collateral — into the contract. For new members this is 2x their contribution amount. For members with strong credit scores the requirement is lower.

Collateral is not a fee. It is returned in full when the group completes. It exists purely as protection for other group members — if a member defaults, their collateral covers the winner's payout so no one else suffers.

Once every member has locked collateral, the group activates automatically. No admin action required.

**Contributing Each Round**

Members contribute via their local currency through Stellar anchors. The experience is intentionally simple — a payment button, a confirmation, done. The anchor conversion, the Stellar transaction, the contract interaction all happen in the background. Members see their local currency amount, not USDC.

**Yield Between Rounds**

After contributions are in, the AI Yield Agent evaluates whether it is safe to deploy funds. If the round deadline is far enough away and the group has no flagged members, it calls `deploy_to_blend` and the contract deposits the pooled contributions into Blend Protocol. Yield accrues. Before the payout deadline the agent withdraws automatically, and the winner receives the contributions plus whatever was earned.

**Payout**

The smart contract distributes the pot to the round winner. The selection is made by the AI based on rotation — members who have not yet received a payout are prioritised. Among eligible members, higher credit score gets earlier rounds. The winner's payout is sent as USDC, which the anchor converts back to their local currency and deposits to their bank or mobile money account.

**Handling Defaults**

If a member has not paid when the deadline passes, the AI Default Predictor evaluates the situation. It considers how far past the deadline they are, their credit history, whether this is a first offense. If the situation warrants it the agent calls `handle_default` on the contract, the defaulter's collateral is slashed, and the winner is paid from that collateral. The full reasoning is logged publicly. The defaulter's credit score is reduced — more severely for repeat offenses.

The winner always gets paid. The group always continues. The defaulter bears the consequence.

---

## The AI Layer

AjoFi is not AI-assisted — it is AI-operated. The smart contract is the law. The AI agents are the judges and executors. Every decision they make is logged publicly with the full chain of reasoning so that any member, at any time, can read exactly what the AI decided and why.

This transparency is what makes it possible for strangers to trust the system. You do not have to trust the other members. You do not have to trust AjoFi as a company. You have to trust that the AI's reasoning is sound — and you can verify every decision it has ever made.

---

### Credit Scorer

**What it does:** After every round event — contribution paid, round advanced, default handled, group completed — the Credit Scorer reads the member's full on-chain history and recalculates their score from 0 to 100.

**What it considers:**
- Contribution timeliness: did they pay before or after the deadline, and by how much
- Default history: number of defaults, severity, recency
- Streak: consecutive clean rounds without a late payment
- Group completion rate: how many groups have they finished vs abandoned
- Improvement trajectory: is their recent behaviour better or worse than their historical average

**What the score affects:**
- **Payout order** — within a group, higher-score members receive earlier rounds. This is a direct financial incentive to maintain a good score.
- **Matchmaking priority** — high-score members are matched with each other. Consistent payers get grouped with consistent payers.
- **Collateral requirement** — new members lock 2x contribution. Members with a score above 80 lock 1.5x. Members with a score above 95 and multiple completed groups lock 1.2x. This is the primary long-term incentive to stay on AjoFi — your score follows you, and it saves you real money.

The credit score is portable. It is recorded on Stellar and can be queried by any third party. In Phase 3 it becomes the foundation of a credit API that lenders can use to underwrite people who have no formal credit history.

---

### Default Predictor

**What it does:** Monitors every active group in real time, evaluating each unpaid member's likelihood of defaulting before the current round closes.

**What it considers:**
- Historical payment timing: this member's average gap between round open and payment
- Late payment pattern: have they been cutting it close recently
- Current time relative to deadline: how much time is left, is the member's typical payment window already past
- Credit score trend: is it declining, suggesting deteriorating financial behaviour

**What it can do:**
- **Flag a member** — marks them as high-risk in the group state, visible to other members and factored into yield decisions
- **Trigger a collateral hold** — if risk is high enough, prevents the Yield Agent from deploying funds until the situation resolves. Keeps the group liquid in case a slash is needed.
- **Recommend patience** — if the member has a strong track record and the deadline has not yet passed, advise waiting rather than escalating

This agent acts before defaults happen, not after. Early identification reduces the damage to the group and gives the member a chance to pay before collateral is at risk.

---

### Yield Agent

**What it does:** Manages the deployment of idle group funds to Blend Protocol between contributions and payout. Every 15 seconds it evaluates each active group and decides: deploy, withdraw, or hold.

**What it considers:**
- Time until the next payout deadline
- Whether all members have paid (partial deployment is allowed but carries more risk)
- Whether any members are flagged by the Default Predictor
- Current fund status — already deployed or sitting idle

**Decision logic:**
- **DEPLOY**: Fund status is idle, there are funds to deploy, and more than 2 hours remain until the deadline. No flagged members in the group.
- **WITHDRAW**: Funds are deployed in Blend and less than 1 hour remains until the deadline. Time to bring funds back.
- **HOLD**: Everything else — not enough time to meaningfully earn, a flagged member in the group, deadline too close, or uncertain situation.

Every decision is logged with the agent's reasoning. Members can track exactly when their funds were in Blend, how long they were there, and how much yield was earned.

---

### Ramp Selector

**What it does:** When a member initiates a fiat contribution, this agent queries Paychant and Afripay in real time for the current exchange rate on the relevant corridor — NGN→USDC, GHS→USDC, or XOF→USDC. It selects the anchor offering the best rate for that specific transaction and routes accordingly.

**Why this matters:** Anchor rates are not static. They fluctuate based on liquidity, demand, and market conditions. A member contributing NGN 50,000 every month could lose meaningful value over a year if they are always hitting a suboptimal rate. The Ramp Selector ensures every transaction goes through the best available route without the member needing to think about it.

**What it considers:**
- Current buy rate from Paychant for the corridor
- Current buy rate from Afripay for the corridor (where applicable)
- Transaction size — some anchors have better rates at certain amounts
- Anchor availability — if one anchor is experiencing downtime, route to the other

The routing decision and the rates at time of routing are logged with every transaction.

---

## Why Stellar

Stellar was not chosen arbitrarily. It is the only blockchain where all of AjoFi's core components exist in one ecosystem.

**The anchor infrastructure is already built.**

Paychant is a live, licensed Stellar SEP-24 anchor handling NGN and GHS. Afripay is a live Stellar SEP-24 anchor handling XOF and XAF, funded by the Stellar Community Fund. These are not integrations to be negotiated or built from scratch — they are operational services following an open standard that AjoFi plugs into.

On Ethereum, building the fiat ramp layer for West Africa would require custom agreements, custom APIs, and months of compliance work per corridor. On Stellar it is a standard protocol call.

**SEP-24 is a genuine standard.**

Every Stellar anchor implements SEP-24 — the same deposit and withdrawal flow, the same API contract, the same authentication mechanism. AjoFi writes its anchor integration once and it works with every compliant anchor. Adding a new country corridor is adding a new anchor endpoint, not rewriting integration code. This is what makes geographic expansion tractable.

**Blend Protocol is native.**

Blend is a Stellar-native lending and borrowing protocol. AjoFi's yield integration involves no bridging, no wrapped assets, no cross-chain messaging, no additional trust assumptions. Funds deposited into Blend and retrieved from Blend never leave the Stellar network. This matters for a protocol where speed of withdrawal is critical — a payout deadline cannot be missed because a bridge was slow.

**Transaction fees make micro-contributions viable.**

Ajo groups run on small amounts. The whole point is that ordinary people — not wealthy investors — can participate. A $10 or $20 monthly contribution on Ethereum would be eaten alive by gas fees. On Stellar the transaction cost is fractions of a cent. This is not a secondary consideration — it is what makes the protocol economically viable for its actual target users.

**Soroban is the right contract layer.**

Rust-based smart contracts, deterministic execution, auditable bytecode, composability with the rest of the Stellar ecosystem. Soroban gives AjoFi the programmable escrow it needs without compromising on the speed and cost profile that makes Stellar suitable for this use case.

---

## Integrations

| Integration | Purpose | Coverage |
|---|---|---|
| **Paychant (SEP-24)** | NGN and GHS fiat on/off-ramp | Nigeria, Ghana |
| **Afripay (SEP-24)** | XOF and XAF fiat on/off-ramp | Francophone West Africa |
| **Blend Protocol** | Yield on idle pooled funds | Stellar-native |
| **Stellar Wallets Kit** | Wallet connection for end users | Freighter, LOBSTR, xBull |
| **OpenAI API (GPT-4o)** | Four autonomous AI agents | All protocol decisions |

---

### Paychant

Paychant is a Nigerian fintech company operating as a licensed Stellar SEP-24 anchor. They support bank transfer, USSD, and mobile money for deposits and withdrawals in NGN and GHS. Their SEP-24 anchor went live on Stellar in July 2024 and is in active production.

For AjoFi, Paychant is the primary fiat gateway for Nigeria and Ghana — the two largest ajo markets. A Nigerian member pays NGN into Paychant via bank transfer or USSD. Paychant converts it to USDC and delivers it to the member's Stellar wallet. When a member wins their payout, the process reverses — USDC goes to Paychant, NGN arrives in their bank account. The member never touches USDC directly if they do not want to.

Developer documentation: [developer.paychant.com](https://developer.paychant.com)

---

### Afripay Finance

Afripay Finance is a Stellar SEP-24 anchor issuing XOF and XAF stablecoins pegged 1:1 to the CFA franc. They are operational in Cameroon with coverage expanding across Francophone West Africa — Senegal, Côte d'Ivoire, Mali, Burkina Faso, and beyond. Afripay was funded by the Stellar Community Fund and is built specifically for the Francophone corridor that larger payment providers have consistently underserved.

For AjoFi, Afripay opens the Francophone market — roughly 180 million people across 14 countries who share the CFA franc and the tontine savings tradition. Without Afripay, AjoFi would be English West Africa only. With it, the protocol reaches the full continent.

GitHub: [github.com/AFRIPAYFINANCE](https://github.com/AFRIPAYFINANCE)
Contact: main.admin@afripay.finance

---

### Blend Protocol

Blend is a decentralised, permissionless lending and borrowing protocol native to Stellar. It allows any asset to be used as collateral to borrow other assets, and depositors earn yield on supplied assets.

AjoFi uses Blend purely as a yield source — not for borrowing. Between rounds, the Yield Agent deposits the pooled contribution funds into Blend's supply side. Those funds earn the current supply APY. Before the payout deadline, the agent withdraws. The group's round winner receives contributions plus accumulated yield.

The key property that makes this work: Blend is on Stellar, which means withdrawals are near-instant. There is no bridge latency, no withdrawal queue, no uncertainty about whether funds will be available in time for a payout. The agent can deploy funds with a 2-hour buffer and confidently withdraw before the deadline.

---

### Stellar Wallets Kit

Stellar Wallets Kit is a unified wallet connection library for Stellar applications. It supports Freighter, LOBSTR, xBull, and other Stellar wallets through a single interface. AjoFi uses it so members can connect whatever Stellar wallet they already have without needing a specific one.

---

### OpenAI API

All four of AjoFi's AI agents are powered by GPT-4o via the OpenAI API. GPT-4o was chosen for its reliability on structured JSON output — every agent prompt specifies an exact JSON schema and the model returns consistent, parseable decisions. The agents operate at low temperature (0.2) for deterministic, conservative decision-making appropriate for financial operations.

Every API call is logged with the full prompt context, the model's reasoning, and the resulting action. This logging is what makes AjoFi's AI layer auditable — you can reconstruct exactly what information the model had and why it made the decision it did.

---

## Business Model

AjoFi generates revenue through three streams that scale together as the protocol grows.

---

### 1. Protocol Fee on Payouts (1–2%)

Every time a round pays out, AjoFi takes a small protocol fee. At 1% on a group of 5 contributing $50 each, that is $2.50 per payout. Across thousands of concurrent groups this compounds quickly.

The critical thing that makes this fee acceptable to members: they receive more than they contributed because of Blend yield. Even after the protocol fee, the winner's payout exceeds the sum of contributions. The fee is invisible as a cost because the yield more than covers it.

---

### 2. Yield Spread (20% of Blend yield)

AjoFi retains 20% of all yield earned through Blend Protocol and distributes the remaining 80% to the round winner. This is entirely passive — it scales with total value locked across all active groups.

As the protocol grows, more groups run simultaneously, more idle funds sit in Blend between rounds, and more yield accrues. The yield spread grows without any marginal cost to AjoFi.

---

### 3. Credit Data API

The on-chain credit scores generated by AjoFi's Credit Scorer are uniquely valuable to lenders. They represent payment behaviour for a population that has no formal credit history — exactly the people that microfinance institutions, digital lenders, and eventually traditional banks want to underwrite but cannot because the data does not exist anywhere accessible.

AjoFi exposes a credit score API that any lender can query. A microfinance institution considering a loan application can query the applicant's AjoFi score and see years of verified payment history on Stellar. AjoFi charges per query.

This creates a B2B revenue stream that is entirely separate from the consumer product and grows as the credit history dataset becomes richer and more complete.

---

### The Flywheel

More users → more active groups → more payouts → more fee revenue. More idle funds in Blend → more yield spread. More completed rounds → richer credit data → more valuable credit API → more lender queries → more revenue. Better credit data also means better matchmaking, lower collateral requirements, more attractive product, more users.

Each stream reinforces the others.

---

## Target Audience

---

### Primary — Diaspora West Africans

Nigerians, Ghanaians, and Senegalese living in the UK, United States, Canada, and Europe. This group is AjoFi's first and most important market segment for several reasons:

They have the pain point most acutely. They grew up in ajo culture, they want to participate with family and friends back home, and they are currently excluded by payment rails. AjoFi solves a real and felt problem for them.

They are crypto-comfortable. Diaspora West Africans are disproportionately early adopters of fintech and crypto. They already use Stellar-adjacent tools for remittances. The wallet setup barrier is lower for this segment than for any other.

They have disposable income. Diaspora members can contribute more per round than participants in Lagos or Accra. Higher contribution amounts mean more yield, more fees, more credit data per group.

They are connected to both sides. A diaspora member joining an AjoFi group creates a bridge — they are matched with participants back home, they bring the anchor integration to life (USDC on one side, NGN/GHS/XOF on the other), and they validate the multi-corridor thesis in production.

---

### Secondary — Urban West African Professionals

Young professionals in Lagos, Accra, and Abidjan who already run ajo groups via WhatsApp. They know the trust problem personally — most have a story of a group that collapsed because of an unreliable organizer or a defaulting member. They want the safety of on-chain escrow without having to manage it themselves.

This segment is the volume market domestically. They are mobile-first, fintech-friendly, and already have the savings habit. AjoFi does not need to teach them what ajo is or why it is valuable — they just need a reason to switch from WhatsApp to on-chain.

---

### Long-term — The Unbanked Saver

Someone who has never had a formal bank account but participates in ajo via mobile money. Paychant supports USSD and mobile money for NGN deposits — no bank account required. Afripay supports mobile money for XOF. This segment is the long-term mass market, accessible as anchor infrastructure matures and as AjoFi's UX is simplified for lower-tech users.

This is not the launch market. But the architecture supports them from day one.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                           │
│                                                                    │
│  Register Intent  ·  Group Dashboard  ·  Credit Profile          │
│  Agent Reasoning Log  ·  Payout History  ·  Group Invite         │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Stellar Wallets Kit
                            │ (Freighter / LOBSTR / xBull)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                  AjoFi Soroban Vault Contract                      │
│                                                                    │
│  Group State  ·  Collateral  ·  Contributions  ·  Payouts        │
│  Credit Scores  ·  Intent Registry  ·  Fund Status               │
└────────────────┬─────────────────────────────┬────────────────────┘
                 │ reads state                 │ executes decisions
                 │                             │
                 ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│     AI Agent Layer        │   │          Integrations             │
│     (OpenAI GPT-4o)       │   │                                   │
│                           │   │  Paychant SEP-24  (NGN / GHS)    │
│  ┌─────────────────────┐  │   │  Afripay SEP-24   (XOF / XAF)   │
│  │   Credit Scorer     │  │   │  Blend Protocol   (Yield)        │
│  ├─────────────────────┤  │   │                                   │
│  │  Default Predictor  │  │   └──────────────────────────────────┘
│  ├─────────────────────┤  │
│  │    Yield Agent      │  │
│  ├─────────────────────┤  │
│  │   Ramp Selector     │  │
│  └─────────────────────┘  │
│                           │
│  reasoning.log.json ──────┼──→ Frontend Agent Log page
└──────────────────────────┘
```

---

### Contract Design

The Soroban vault contract is the single source of truth and the sole custodian of member funds. No wallet — not AjoFi's, not the agent's, not any admin — holds or can move member funds outside of the functions defined in the contract. The agent submits signed transactions to call contract functions; it never holds value.

**Member-callable functions:**

```rust
// Register savings intent for AI matchmaking
fn register_intent(env, caller, contribution_amount, desired_group_size, round_duration)

// Lock security deposit to join a matched group
fn lock_collateral(env, caller, group_id)

// Pay round contribution
fn pay_contribution(env, caller, group_id)
```

**Agent-only functions (restricted by agent wallet address):**

```rust
// Create a group from matched intents
fn create_group(env, member_wallets, contribution_amount, round_duration) -> group_id

// Deploy idle contributions to Blend Protocol
fn deploy_to_blend(env, group_id)

// Withdraw from Blend before payout
fn withdraw_from_blend(env, group_id)

// Advance round and pay winner
fn advance_round(env, group_id, winner)

// Slash defaulter collateral and pay winner
fn handle_default(env, group_id, defaulter, winner, reason)
```

---

### Collateral Model

Every member locks a security deposit when joining a group. This deposit is:

- Held entirely by the Soroban contract — not AjoFi, not any individual
- Never deployed to yield — kept liquid at all times so it can be used immediately for a slash
- Returned in full at group completion to members who did not default
- Slashed automatically when a member defaults, covering the winner's full payout

The collateral requirement scales with credit score:

| Credit Score | Collateral Required | Notes |
|---|---|---|
| No history (new wallet) | 2.0x contribution | Default for all new members |
| 60–79 | 1.75x contribution | Some history, minor issues |
| 80–94 | 1.5x contribution | Strong history, no defaults |
| 95–100 | 1.2x contribution | Excellent history, multiple completions |

This creates a direct financial incentive to maintain a high score. A member contributing $100/month who improves their score from new to excellent saves $80 in locked collateral — real money that they keep accessible.

---

### Agent Loop

The AI agent runs as a Node.js backend service. Every 15 seconds it executes a full tick:

1. Calls `get_all_intents()` — runs matchmaking if compatible groups can be formed
2. Calls `get_all_active_groups()` — gets all group IDs currently in active state
3. For each active group:
   - Calls `get_group()` and `get_group_members()` to read current state
   - Runs Default Predictor — checks for at-risk members if deadline is approaching
   - Runs Yield Agent — evaluates deploy/withdraw/hold decision
   - Checks if all members have paid — runs Round Advancement if so
4. Appends all decisions to `reasoning.log.json`
5. Log is served to the frontend via `/api/log`

Every GPT-4o call uses `response_format: json_object` and low temperature. The agent never interprets free-form text — every response is a structured JSON object with an action field and a reasoning field.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar Testnet / Mainnet |
| Smart Contracts | Soroban (Rust) |
| Yield Protocol | Blend Protocol (Stellar-native) |
| Fiat On-Ramp (NGN/GHS) | Paychant — SEP-24 |
| Fiat On-Ramp (XOF/XAF) | Afripay Finance — SEP-24 |
| Wallet Connection | Stellar Wallets Kit |
| AI Agents | OpenAI API — GPT-4o |
| Agent Runtime | Node.js, Stellar SDK |
| Frontend | React, TypeScript, Tailwind CSS |
| Frontend Wallet | Stellar Wallets Kit |

---

## Sprint Status

### What's Built

| Component | Notes |
|---|---|
| Soroban vault contract — escrow, collateral, contributions, payouts, intent registry, credit scores | Live on testnet |
| AI Matchmaking Agent — scans intents every 15s, forms groups on-chain, logs full reasoning | Running |
| AI Credit Scorer — recalculates member score after every round event | Running |
| AI Default Predictor — monitors unpaid members before deadline | Running |
| AI Yield Agent — deploy / withdraw / hold logic against Blend Protocol | Built · disabled for demo (see note) |
| Custom SEP-24 demo anchor — NGN and GHS deposit and withdrawal, mints USDC to Stellar wallet | Live on Render |
| Stellar Wallets Kit — Freighter, LOBSTR, xBull wallet connection | Live |
| Frontend — landing, country selector (Nigeria / Ghana), intent page, dashboard, group page | Live on Vercel |
| Agent reasoning log — every AI decision with full reasoning, served via `/log` | Live |
| Autonomous agent on Render, GitHub Actions keepalive (every 5 min) | Running |

**Note on Blend:** The yield integration is fully built and was running in production. It is disabled for the demo because Stellar testnet groups run in short timeframes — yield on Blend accrues slowly and the rounding loss on withdrawal (a few stroops) was enough to block payouts at small test amounts. In a real weekly group, idle funds sit in Blend for days and yield is meaningful. The architecture is complete; re-enabling is a one-line change.

### What's Left

| Component | Notes |
|---|---|
| Paychant SEP-24 integration (NGN / GHS) | Production anchor — current anchor is custom demo build |
| AI Ramp Selector — live rate routing between anchors | Agent scaffolded, needs live anchor rate API wired |
| Collateral tiers by credit score | Scoring runs and data accumulates — contract enforcement not yet active |
| `handle_default` end-to-end | Default Predictor flags members — on-chain collateral slash not tested against a real deadline breach |
| Agent reasoning log page on frontend | `/log` endpoint live — frontend display page not built |
| Credit Data API | Designed — not built |
| Mainnet deployment | Testnet stable — pending mainnet migration |

---

## Repository Structure

```
ajofi/
├── contracts/
│   └── src/
│       ├── lib.rs                    # Soroban vault contract — main entry point
│       ├── types.rs                  # Structs: Group, Member, Intent, GroupStatus
│       ├── storage.rs                # Contract storage key helpers
│       └── errors.rs                 # Custom ContractError types
│
├── agent/
│   ├── src/
│   │   ├── treasurer.js              # Main autonomous loop — 15s tick
│   │   ├── agents/
│   │   │   ├── creditScorer.js       # Credit Scorer agent
│   │   │   ├── defaultPredictor.js   # Default Predictor agent
│   │   │   ├── yieldAgent.js         # Yield Agent — Blend management
│   │   │   └── rampSelector.js       # Ramp Selector — Paychant vs Afripay
│   │   ├── prompts.js                # GPT-4o prompt builders for all 4 agents
│   │   ├── logger.js                 # Structured decision logging
│   │   └── stellar.js                # Stellar SDK helpers and contract calls
│   ├── index.js                      # Entry point
│   ├── .env.example                  # Environment variable template
│   └── reasoning.log.json            # Generated at runtime — all AI decisions
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── index.tsx             # Landing page — register intent
    │   │   ├── dashboard/
    │   │   │   └── [groupId].tsx     # Group dashboard — live state, pay, collateral
    │   │   ├── profile/
    │   │   │   └── index.tsx         # Credit profile — score, history, groups
    │   │   └── log/
    │   │       └── index.tsx         # Agent reasoning log — all AI decisions
    │   ├── components/
    │   │   ├── GroupCard.tsx
    │   │   ├── MemberRow.tsx
    │   │   ├── CreditBadge.tsx
    │   │   └── ReasoningEntry.tsx
    │   ├── lib/
    │   │   ├── stellar.ts            # Stellar SDK and Horizon config
    │   │   ├── contract.ts           # Contract function wrappers
    │   │   └── anchors.ts            # SEP-24 deposit/withdrawal helpers
    │   └── hooks/
    │       ├── useGroup.ts
    │       ├── useCredit.ts
    │       └── useAnchors.ts
    └── public/
```

---

## Setup

### Prerequisites

- Rust toolchain with `wasm32-unknown-unknown` target
- Stellar CLI (`stellar`)
- Node.js 18+
- A Stellar wallet (Freighter recommended)
- OpenAI API key with GPT-4o access
- Stellar testnet account — fund via [Friendbot](https://friendbot.stellar.org)

---

### 1. Smart Contract

```bash
cd contracts

# Add WASM target if not already installed
rustup target add wasm32-unknown-unknown

# Build contract
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test

# Deploy to Stellar testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ajofi.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet

# Note the contract ID — you will need it for the agent and frontend
```

---

### 2. AI Agent

```bash
cd agent

npm install

cp .env.example .env
```

Fill in `agent/.env`:

```env
OPENAI_API_KEY=sk-...                  # OpenAI API key (GPT-4o)
AGENT_SECRET_KEY=S...                  # Stellar secret key for agent wallet
HORIZON_URL=https://horizon-testnet.stellar.org
CONTRACT_ID=C...                       # Deployed Soroban contract ID
POLL_INTERVAL_MS=15000                 # How often the treasurer checks (15s)
PAYCHANT_API_KEY=...                   # Paychant sandbox API key
AFRIPAY_API_KEY=...                    # Afripay testnet API key
BLEND_CONTRACT_ID=C...                 # Blend Protocol contract ID on testnet
```

```bash
# Start the treasurer
npm start

# Development mode with auto-restart
npm run dev
```

The agent starts immediately and logs every tick to the console. All decisions are written to `reasoning.log.json` in real time.

---

### 3. Frontend

```bash
cd frontend

npm install

cp .env.example .env.local
```

Fill in `frontend/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ID=C...
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
```

```bash
npm run dev
# → http://localhost:3000
```

**Add Stellar testnet to Freighter:**

| Field | Value |
|---|---|
| Network Name | Stellar Testnet |
| Horizon RPC URL | https://horizon-testnet.stellar.org |
| Passphrase | Test SDF Network ; September 2015 |

---

## Builder

**Akinsanya Daniel** — Full-stack Web3 developer.

Selected builder — Stellar West Africa Build Residency Program, April 2026.

GitHub: [github.com/dannyy2000](https://github.com/dannyy2000)

---

*AjoFi brings Africa's most trusted savings tradition on-chain — removing the dishonest organizer and replacing them with a smart contract that never steals, an AI that never sleeps, and a protocol that always pays.*
