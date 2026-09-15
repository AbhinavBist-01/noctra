import { db } from "../db";
import { account } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { corsair } from "../corsair";
import { setupCorsair } from "corsair/setup";
import { AppError } from "../lib/app-error";
import { clearTenantCache } from "../corsair/tenant";

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
 * Refreshes the user's Google OAuth access token using their stored refresh token.
 * Updates the database account row with the new access token and expiration.
 */
export async function refreshGoogleAccessToken(
  userId: string,
  force = false,
): Promise<string | null> {
  const googleAccount = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!googleAccount) return null;

  const expiresAt = googleAccount.accessTokenExpiresAt
    ? new Date(googleAccount.accessTokenExpiresAt).getTime()
    : 0;
  const isExpiringSoon = expiresAt > 0 ? Date.now() >= expiresAt - 300000 : true;

  if (!force && !isExpiringSoon && googleAccount.accessToken) {
    return googleAccount.accessToken;
  }

  if (!googleAccount.refreshToken) {
    return googleAccount.accessToken ?? null;
  }

  const clientId =
    process.env.BETTER_AUTH_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[refreshGoogleAccessToken] Google OAuth client credentials missing in env");
    return googleAccount.accessToken ?? null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: googleAccount.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        access_token: string;
        expires_in?: number;
        scope?: string;
      };
      const newAccessToken = data.access_token;
      const newExpiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 3600 * 1000);

      await db
        .update(account)
        .set({
          accessToken: newAccessToken,
          accessTokenExpiresAt: newExpiresAt,
          ...(data.scope ? { scope: data.scope } : {}),
          updatedAt: new Date(),
        })
        .where(eq(account.id, googleAccount.id));

      console.log(`[corsair] Fresh Google access token obtained for user ${userId}`);
      return newAccessToken;
    } else {
      const errText = await res.text();
      console.warn(`[refreshGoogleAccessToken] Token refresh failed (${res.status}): ${errText}`);
      if (errText.includes("invalid_grant")) {
        console.warn(
          `[refreshGoogleAccessToken] Stored refresh token was revoked or expired by Google for user ${userId}. Re-authentication required.`,
        );
        return null;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[refreshGoogleAccessToken] Error: ${msg}`);
  }

  if (isExpiringSoon) return null;
  return googleAccount.accessToken ?? null;
}

/**
 * Called immediately after a user signs in with Google (or lazily on first request).
 * Uses Corsair's official `setupCorsair` API to:
 *  1. Ensure a fresh access token exists
 *  2. Create corsair_integrations + corsair_accounts rows (idempotent)
 *  3. Issue DEKs for the tenant (idempotent)
 *  4. Write the current OAuth tokens into Corsair's encrypted store
 */
export async function setupUserSync(userId: string): Promise<SyncResult> {
  // 1. Ensure access token is fresh
  const activeToken = await refreshGoogleAccessToken(userId);

  // Fetch the Google account row that Better Auth manages
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

  const tokenToUse = activeToken || googleAccount.accessToken;
  if (!tokenToUse) {
    console.warn(
      `[corsair] User ${userId} Google token is revoked or expired. Skipping sync until user re-authenticates.`,
    );
    return { gmail: false, calendar: false };
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
      await plugin.keys.set_access_token(tokenToUse);
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
      if (pluginName === "gmail" && process.env.GMAIL_PUBSUB_TOPIC) {
        await (plugin.keys as any).set_topic_id?.(process.env.GMAIL_PUBSUB_TOPIC).catch(() => {});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[corsair] Failed to set keys for ${pluginName}: ${msg}`);
    }
  }

  clearTenantCache();

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
