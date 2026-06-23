import "dotenv/config";
import { agent } from "./src/server/lib/agent";

async function run() {
  console.log("=== Testing agent with Gemini ===");
  try {
    const reply = await agent([
      { role: "user", content: "Say 'Hello, Gemini is working!'" }
    ]);
    console.log("Response:", reply);
  } catch (err: any) {
    console.error("Gemini Test Failed:", err.message);
  }
  process.exit(0);
}

run();
