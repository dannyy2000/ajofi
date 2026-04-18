import "dotenv/config";
import { createServer } from "http";
import { startTreasurer } from "./src/treasurer.js";

// Health-check server — keeps Render Web Service alive (free tier requires a port binding)
const PORT = process.env.PORT || 3002;
createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "ajofi-treasurer", ts: new Date().toISOString() }));
}).listen(PORT, () => {
  console.log(`[Health] Listening on port ${PORT}`);
});

startTreasurer().catch((err) => {
  console.error("Fatal error starting treasurer:", err);
  process.exit(1);
});
