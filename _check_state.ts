import "dotenv/config";
import { db } from "./src/server/db";
import { account } from "./src/server/db/schema";
import { eq } from "drizzle-orm";
import { corsairIntegrations, corsairAccounts } from "./src/server/db/schema";

// Check BetterAuth account
const accts = await db.select().from(account).where(eq(account.providerId, "google"));
console.log("--- BetterAuth Account ---");
for (const a of accts) {
  console.log("refreshToken:", a.refreshToken ? a.refreshToken.slice(0, 40) + "..." : "null");
  console.log("scope:", a.scope);
  console.log("expiresAt:", a.accessTokenExpiresAt);
}

// Check corsair integrations
const integrations = await db.select().from(corsairIntegrations);
console.log("\n--- Corsair Integrations ---");
for (const i of integrations) {
  console.log(i.name, "| id:", i.id);
}

// Check corsair accounts
const cAccts = await db.select().from(corsairAccounts);
console.log("\n--- Corsair Accounts ---");
for (const a of cAccts) {
  console.log("integrationId:", a.integrationId);
  console.log("  config:", JSON.stringify(a.config).slice(0, 100) + "...");
  console.log("  dek:", a.dek ? a.dek.slice(0, 20) + "..." : "null");
}
