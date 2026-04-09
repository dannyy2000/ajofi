# AjoFi

> AI-powered trustless rotating savings protocol for West Africa, built on Stellar.

## The Problem

Over 14 million West Africans participate in rotating savings groups (ajo/esusu) — a model where members pool contributions and each person collects the full pot on a rotating basis. It is one of the most widespread wealth-building tools across Nigeria, Ghana, Senegal, and beyond.

But the system breaks in three critical ways:

- **Trust failure** — the organizer holds all funds and can disappear. No legal recourse, no regulation.
- **Diaspora exclusion** — members across different countries have no common payment rail to participate together.
- **Invisible credit** — years of faithful savings build zero formal credit history.

## The Solution

AjoFi replaces the dishonest organizer with a Soroban smart contract and layers AI on top to score members, predict defaults, and optimize yield on idle funds.

- **Trustless** — Soroban smart contract holds all funds in escrow and auto-rotates payouts by schedule. No one person controls the pot.
- **Multi-currency** — Members join from Nigeria (NGN), Ghana (GHS), or Francophone West Africa (XOF) using existing Stellar anchors. Diaspora members contribute USDC directly.
- **Yield on idle funds** — Pooled funds are routed to Blend Protocol while members wait for their payout cycle. Everyone earns.
- **On-chain credit** — Contribution history is recorded on-chain and scored by an AI agent, generating a portable credit score usable beyond the group.

## How It Works

```
Member joins group → contributes via local currency (NGN/GHS/XOF)
                  → Anchor converts to USDC (Paychant / Yellow Card / Afripay)
                  → Soroban vault contract receives funds
                  → Idle funds routed to Blend Protocol for yield
                  → AI scores each member's reliability
                  → Smart contract auto-pays winner each cycle
                  → Winner receives payout + share of yield via local off-ramp
                  → On-chain history builds portable credit score
```

## Integrations

| Integration | Purpose |
|---|---|
| **Paychant (SEP-24)** | NGN and GHS fiat on/off-ramp via bank transfer, USSD, mobile money |
| **Yellow Card** | Backup ramp, wider country coverage |
| **Afripay** | XOF/XAF stablecoins on Stellar for Francophone West Africa |
| **Blend Protocol** | Yield on idle pooled funds |
| **Stellar Wallets Kit** | Wallet connection for end users |

## AI Layer

| Agent | Function |
|---|---|
| Credit Scorer | Scores each member 0–100 based on on-chain contribution history |
| Default Predictor | Flags members likely to miss a contribution before the cycle closes |
| Ramp Selector | Picks the best on-ramp (Paychant vs Yellow Card) by rate in real time |
| FX Normalizer | Ensures XOF/GHS/NGN contributions are equivalent in USDC value |

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Soroban (Rust) |
| Frontend | React + Stellar Wallets Kit |
| Yield | Blend Protocol |
| Fiat On/Off-Ramp | Paychant SEP-24, Yellow Card API, Afripay |
| AI | Claude API (credit scoring + risk prediction agents) |
| FX | Stellar DEX on-chain prices |

## Status

Under active development — Stellar WA Build Weekend Residency Program (April 2026).

## Builder

**Akinsanya Daniel** — Full-stack Web3 developer.
GitHub: [github.com/dannyy2000](https://github.com/dannyy2000)
