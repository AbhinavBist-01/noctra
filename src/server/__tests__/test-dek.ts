import "dotenv/config";
import { conn } from "../db";

async function main() {
  const timeout = setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 10000);
  
  const accounts = await conn`SELECT id, integration_id, config, dek FROM corsair_accounts`;
  console.log("Accounts:", accounts.length);
  for (const a of accounts) {
    const int = await conn`SELECT name FROM corsair_integrations WHERE id = ${a.integration_id}`;
    const name = int[0]?.name || "unknown";
    console.log(`  ${name}: has_dek=${a.dek ? "yes" : "no"}, config=${JSON.stringify(a.config).slice(0, 100)}`);
  }
  
  clearTimeout(timeout);
  process.exit(0);
}

main();
