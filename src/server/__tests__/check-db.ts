import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  const accounts = await sql`SELECT id, provider_id, user_id, access_token IS NOT NULL as has_token FROM account`;
  console.log("=== BetterAuth accounts ===");
  accounts.forEach((a: any) => console.log(JSON.stringify(a)));

  const googleAccounts = accounts.filter((a: any) => a.provider_id === "google");
  console.log("\nGoogle-linked accounts:", googleAccounts.length);

  const integrations = await sql`SELECT id, name, config FROM corsair_integrations`;
  console.log("\n=== Corsair integrations ===");
  integrations.forEach((i: any) => console.log(JSON.stringify(i)));

  const ca = await sql`SELECT id, integration_id, tenant_id, config FROM corsair_accounts`;
  console.log("\n=== Corsair accounts ===");
  ca.forEach((a: any) => console.log(JSON.stringify(a)));

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
