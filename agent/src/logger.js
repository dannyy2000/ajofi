/**
 * Decision Logger
 *
 * Every decision the AI treasurer makes is written here — matchmaking,
 * yield, defaults, payouts. The frontend reads this file and displays it
 * publicly so any group member can audit every call the agent ever made.
 *
 * Transparency is what makes strangers trust the system.
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH   = path.join(__dirname, "..", "reasoning.log.json");

function readLog() {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const raw = fs.readFileSync(LOG_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logDecision({ type, groupId, action, reasoning, txHash = null, metadata = {} }) {
  const entry = {
    id:        Date.now(),
    timestamp: new Date().toISOString(),
    type,           // MATCHMAKING | YIELD | DEFAULT | ROUND_ADVANCE | CREDIT_SCORE
    groupId:   groupId ? String(groupId) : null,
    action,         // What the agent did — CREATE_GROUP, DEPLOY, WITHDRAW, HOLD, SLASH, WAIT, ADVANCE, UPDATE_SCORE
    reasoning,      // Full Claude reasoning text — shown to group members
    txHash,         // Stellar transaction hash if a transaction was submitted
    ...metadata,
  };

  const log = readLog();
  log.unshift(entry); // newest first

  // Keep last 500 entries — enough for a full demo history
  const trimmed = log.slice(0, 500);
  fs.writeFileSync(LOG_PATH, JSON.stringify(trimmed, null, 2));

  console.log(
    `[${entry.timestamp}] ${type} | Group ${groupId ?? "-"} | ${action}${txHash ? ` | TX: ${txHash}` : ""}`
  );
  console.log(`  Reasoning: ${reasoning.slice(0, 120)}${reasoning.length > 120 ? "…" : ""}`);
}
