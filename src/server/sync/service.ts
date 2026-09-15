import { db } from "../db";
import { account } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { corsair } from "../corsair";
import { setupCorsair } from "corsair/setup";
import { AppError } from "../lib/app-error";

export type SyncResult = {
  gmail: boolean;
  calendar: boolean;
};

const PLUGINS = ["gmail", "googlecalendar"] as const;

const initializedUsers = new Set<string>();

/**
 * Ensures DEKs and OAuth tokens are provisioned for a given user.
 * Runs idempotently once per process per userId on demand.
 */
export async function ensureUserSync(userId: string, force = false): Promise<void> {
  if (!force && initializedUsers.has(userId)) return;

  try {
    await setupUserSync(userId);
    initializedUsers.add(userId);
  } catch (err) {
    initializedUsers.delete(userId);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[corsair] Auto DEK sync for user ${userId}: ${msg}`);
  }
}

/**
 * Called immediately after a user signs in with Google (or lazily on first request).
 * Uses Corsair's official `setupCorsair` API to:
 *  1. Create corsair_integrations + corsair_accounts rows (idempotent)
 *  2. Issue DEKs for the tenant (idempotent)
 *  3. Write the current OAuth tokens from Better Auth's account row
 */
export async function setupUserSync(userId: string): Promise<SyncResult> {
  // 1. Fetch the Google account row that Better Auth manages
  const googleAccount = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!googleAccount) {
    throw new AppError(
      "VALIDATION_ERROR",
      "No Google account linked. Sign in with Google first.",
    );
  }

  if (!googleAccount.accessToken) {
    throw new AppError("VALIDATION_ERROR", "Google access token not found.");
  }

  // 2. Provision rows + DEKs via the official Corsair API (idempotent)
  //    tenantId = userId so every user gets their own encrypted credential slot
  await setupCorsair(corsair as any, { tenantId: userId });
  const tenantClient = corsair.withTenant(userId);

  // 3. Write the OAuth tokens into Corsair's encrypted key store for each plugin
  for (const pluginName of PLUGINS) {
    const plugin =
      pluginName === "gmail"
        ? tenantClient.gmail
        : tenantClient.googlecalendar;

    try {
      await plugin.keys.set_access_token(googleAccount.accessToken);
      if (googleAccount.refreshToken) {
        await plugin.keys.set_refresh_token(googleAccount.refreshToken);
      }
      if (googleAccount.scope) {
        await plugin.keys.set_scope(googleAccount.scope);
      }
      if (googleAccount.accessTokenExpiresAt) {
        await plugin.keys.set_expires_at(
          googleAccount.accessTokenExpiresAt.toISOString(),
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[corsair] Failed to set keys for ${pluginName}: ${msg}`);
    }
  }

  // Mark user as initialized
  initializedUsers.add(userId);

  // 4. Smoke-test both integrations
  let gmail = false;
  let calendar = false;

  try {
    await tenantClient.gmail.api.messages.list({ maxResults: 1 });
    gmail = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gmail sync test failed:", msg);
  }

  try {
    await tenantClient.googlecalendar.api.events.getMany({});
    calendar = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Calendar sync test failed:", msg);
  }

  return { gmail, calendar };
}
