/**
 * Prompt Builders
 *
 * Each function builds the exact prompt sent to the AI for a specific
 * decision. Prompts are specific, grounded in real contract state, and
 * always instruct the model to return valid JSON only.
 *
 * Low temperature (0.2) is used across all agents — these are financial
 * decisions, not creative writing. Conservative and deterministic.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Matchmaking
// ─────────────────────────────────────────────────────────────────────────────

export function buildMatchmakingPrompt(intents) {
  return `You are the AjoFi AI Treasurer. AjoFi is a trustless rotating savings protocol for West Africa built on Stellar. Your job right now is matchmaking — grouping people with compatible savings intents so they can save together.

Context: Rotating savings (called ajo in Nigeria, susu in Ghana, tontine in Francophone West Africa) is a system where a group of people contribute a fixed amount every round and each round one member collects the full pot. These people don't know each other — you are the trust layer replacing the human organizer.

UNMATCHED INTENTS ON-CHAIN:
${JSON.stringify(intents, null, 2)}

MATCHING RULES:
- Members in the same group must have identical contributionAmount and roundDuration
- Group size must exactly match desiredGroupSize for every member in the group
- One person can only be in one group at a time
- A wallet can only appear in one group per matchmaking round
- If no valid complete groups can be formed, return empty array

Respond with JSON only — no markdown, no explanation outside the JSON:
{
  "groups": [
    {
      "memberWallets": ["G...", "G..."],
      "contributionAmount": "amount in stroops as string",
      "roundDuration": seconds as number,
      "reasoning": "why these specific people were matched — mention their contribution amounts and how they are compatible"
    }
  ]
}

If no valid matches exist return: { "groups": [] }`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yield Management
// ─────────────────────────────────────────────────────────────────────────────

export function buildYieldPrompt(group, members, nowTs) {
  const secsUntilDeadline = Number(group.round_deadline) - nowTs;
  const hoursUntilDeadline = (secsUntilDeadline / 3600).toFixed(2);
  const totalPaid  = Number(group.paid_count) * Number(group.contribution_amount);
  const idleFunds  = (totalPaid - Number(group.deployed_amount)) / 1e7;
  const allPaid    = Number(group.paid_count) === Number(group.total_members);
  const fundStatus = group.fund_status[0] === "Idle" ? "IDLE" : "DEPLOYED";

  return `You are the AjoFi AI Treasurer managing yield on behalf of a rotating savings group. Between when members contribute and when the round winner is paid, idle funds can be deployed to Blend Protocol (a Stellar-native lending protocol) to earn yield. Your job is to decide whether to deploy, withdraw, or hold right now.

GROUP STATE:
- Group ID: ${group.id}
- Round: ${group.current_round} of ${group.total_members}
- Members paid this round: ${group.paid_count}/${group.total_members}
- All members paid: ${allPaid}
- Fund status: ${fundStatus}
- Idle funds: ${idleFunds} USDC
- Hours until round deadline: ${hoursUntilDeadline}
- Yield earned so far this group: ${Number(group.yield_earned) / 1e7} USDC

MEMBERS:
${members.map((m) => `  ${m.wallet}: paid=${m.has_paid}, collateral=${m.has_collateral}, creditScore=${m.credit_score}, defaults=${m.default_count}`).join("\n")}

DECISION RULES:
- DEPLOY: only if fundStatus is IDLE, idleFunds > 0, hoursUntilDeadline > 2, and no members with has_collateral=false (defaulted members)
- WITHDRAW: if fundStatus is DEPLOYED and (hoursUntilDeadline < 1 OR allPaid is true — all members have contributed so the round can advance immediately)
- HOLD: everything else

These are real people's savings. If there is any doubt, HOLD. Never deploy if a default situation is unresolved.

Respond with JSON only:
{
  "action": "DEPLOY" | "WITHDRAW" | "HOLD",
  "reasoning": "full explanation of your decision — members can read this"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Assessment
// ─────────────────────────────────────────────────────────────────────────────

export function buildDefaultPrompt(group, defaulter, members, nowTs) {
  const secsPastDeadline  = nowTs - Number(group.round_deadline);
  const hoursPastDeadline = (secsPastDeadline / 3600).toFixed(2);

  return `You are the AjoFi AI Treasurer. A round deadline has passed and a member has not paid their contribution. You must decide whether to slash their collateral now or wait.

This decision affects real people. The round winner is waiting to be paid. The defaulting member may have a genuine reason for being late. You must balance fairness to the group against fairness to the individual.

GROUP STATE:
- Group ID: ${group.id}
- Round: ${group.current_round} of ${group.total_members}
- Deadline passed: ${hoursPastDeadline} hours ago

MEMBER WHO HAS NOT PAID:
- Wallet: ${defaulter.wallet}
- Credit score: ${defaulter.credit_score}/100
- Previous defaults in this group: ${defaulter.default_count}
- Has collateral locked: ${defaulter.has_collateral}

ALL MEMBERS THIS ROUND:
${members.map((m) => `  ${m.wallet}: paid=${m.has_paid}, creditScore=${m.credit_score}, defaults=${m.default_count}`).join("\n")}

DECISION GUIDANCE:
- Less than 2 hours past deadline: lean toward WAIT unless repeat offender
- 2–6 hours past deadline: use judgment — first offense with good score = WAIT, repeat = SLASH
- More than 6 hours past deadline: lean toward SLASH
- Credit score below 60 or default_count > 1: lean toward SLASH
- If SLASH: the defaulter's collateral covers the winner's payout in full

This reasoning will be logged publicly and shown to all group members. Be clear and fair.

Respond with JSON only:
{
  "action": "SLASH" | "WAIT",
  "reasoning": "full public explanation of your assessment and decision"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Round Advancement — Winner Selection
// ─────────────────────────────────────────────────────────────────────────────

export function buildRoundAdvancementPrompt(group, members) {
  const totalPayout = (Number(group.paid_count) * Number(group.contribution_amount)) / 1e7;
  const yieldEarned = Number(group.yield_earned) / 1e7;

  return `You are the AjoFi AI Treasurer. All members have paid their contributions for this round. It is time to select who receives the payout.

GROUP STATE:
- Group ID: ${group.id}
- Round: ${group.current_round} of ${group.total_members}
- Total payout available: ${totalPayout} USDC
- Yield earned this round: ${yieldEarned} USDC
- Winner receives: ${(totalPayout + yieldEarned).toFixed(7)} USDC

MEMBERS:
${members.map((m, i) => `  ${i + 1}. ${m.wallet}
     - Credit score: ${m.credit_score}/100
     - Defaults: ${m.default_count}
     - Already received payout: ${m.has_received_payout}
     - Has collateral: ${m.has_collateral}`).join("\n")}

SELECTION RULES:
- You MUST select a member where has_received_payout is false
- Among eligible members, prefer the one with the highest credit score
- If all members have received a payout (final round cleanup), pick highest credit score overall
- Never select a member where has_collateral is false (they defaulted and left the group)

This decision is final and will trigger an on-chain payout. The reasoning will be shown to all group members.

Respond with JSON only:
{
  "winner": "G...",
  "reasoning": "why this specific member was selected — mention their eligibility and credit score"
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit Scoring
// ─────────────────────────────────────────────────────────────────────────────

export function buildCreditScoringPrompt(wallet, currentScore, groupHistory) {
  return `You are the AjoFi AI Credit Scorer. You are responsible for generating a fair, objective credit score (0–100) for a member based on their on-chain savings history across all AjoFi groups.

This score matters: it determines how much collateral this person needs to lock in future groups, how early they receive their payout, and how they are matched with other members. A higher score means more trust, lower collateral, and better groups.

MEMBER WALLET: ${wallet}
CURRENT SCORE: ${currentScore}

ON-CHAIN HISTORY ACROSS ALL GROUPS:
${JSON.stringify(groupHistory, null, 2)}

SCORING RULES (apply strictly):
- Paid on time this round, no defaults ever: score MUST be 100. Do not reduce for any reason.
- Paid on time this round, previously had defaults but has now recovered (3+ clean rounds): increase by 5–10, max 95.
- Paid on time this round, score below 100 due to past defaults: increase by 5 toward 100.
- Did not pay this round (has_paid=false) AND deadline has passed: -20 first offense, -40 repeat.
- Defaulted (collateral slashed): -20 first offense, -40 repeat, floor at 10.
- Completed a full group cycle with no defaults: bonus +5, max 100.

SCORE BOUNDS:
- No defaults, paid on time every round: 100
- One default, now recovered (3+ clean rounds): 80–90
- One default, not yet recovered: 60–70
- Two defaults: 40–50
- Three or more defaults: below 30

Respond with JSON only:
{
  "new_score": number between 0 and 100,
  "reasoning": "clear explanation of what drove the score — the member can read this"
}`;
}
