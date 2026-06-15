import "dotenv/config";
import { db } from "../db";
import { account } from "../db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const accounts = await db
    .select()
    .from(account)
    .where(eq(account.providerId, "google"))
    .limit(1);

  if (accounts.length === 0) {
    console.log("No Google account found");
    return;
  }

  const acct = accounts[0]!;
  console.log("BetterAuth Google account:");
  console.log("  scope:", acct.scope);
  console.log("  has access_token:", !!acct.accessToken);
  console.log("  has refresh_token:", !!acct.refreshToken);
  console.log("  expires_at:", acct.accessTokenExpiresAt);

  // Check if expired
  if (acct.accessTokenExpiresAt) {
    const now = new Date();
    const exp = new Date(acct.accessTokenExpiresAt);
    console.log("  expired:", exp < now);
    console.log("  expires in ms:", exp.getTime() - now.getTime());
  }
}

main().catch((e) => console.error(e));
