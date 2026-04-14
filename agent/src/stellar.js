/**
 * Stellar network setup
 * Agent keypair and RPC server connection live here.
 * Everything else imports from this file.
 */

import { Keypair, SorobanRpc } from "@stellar/stellar-sdk";

export const server = new SorobanRpc.Server(
  process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org"
);

export const agentKeypair = Keypair.fromSecret(process.env.AGENT_SECRET_KEY);
