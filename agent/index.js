import "dotenv/config";
import { startTreasurer } from "./src/treasurer.js";

startTreasurer().catch((err) => {
  console.error("Fatal error starting treasurer:", err);
  process.exit(1);
});
