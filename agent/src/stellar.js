import sdk from "@stellar/stellar-sdk";
const { Keypair, rpc } = sdk;

export const server      = new rpc.Server(process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org");
export const agentKeypair = Keypair.fromSecret(process.env.AGENT_SECRET_KEY);
