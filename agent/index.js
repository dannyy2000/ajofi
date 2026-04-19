import "dotenv/config";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { startTreasurer } from "./src/treasurer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH  = join(__dirname, "reasoning.log.json");

const PORT = process.env.PORT || 3002;
createServer((req, res) => {
  if (req.url === "/log" || req.url === "/decisions") {
    try {
      const log = existsSync(LOG_PATH) ? JSON.parse(readFileSync(LOG_PATH, "utf8")) : [];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(log.slice(0, 20)));
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "ajofi-treasurer", ts: new Date().toISOString() }));
}).listen(PORT, () => {
  console.log(`[Health] Listening on port ${PORT}`);
});

startTreasurer().catch((err) => {
  console.error("Fatal error starting treasurer:", err);
  process.exit(1);
});
