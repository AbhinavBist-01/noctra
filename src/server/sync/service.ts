import { db } from "../db";
import { account } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { corsair } from "../corsair";
import { setupCorsair } from "corsair/setup";
import { AppError } from "../lib/app-error";
import { getTenant, clearTenantCache } from "../corsair/tenant";

export type SyncResult = {
  gmail: boolean;
  calendar: boolean;
};

const PLUGINS = ["gmail", "googlecalendar"] as const;

const initializedUsers = new Set<string>();

/**
 * Ensures DEKs and OAuth tokens are provisioned for a given user.
 * Proactively refreshes near-expired tokens on every call.
 */
export async function ensureUserSync(userId: string, force = false): Promise<void> {
  const isInit = initializedUsers.has(userId);
  if (!force && isInit) {
    // Proactively refresh if token is within 5 mins of expiring
    await refreshGoogleAccessToken(userId, false).catch(() => {});
    return;
  }

  try {
    await setupUserSync(userId, force);
    initializedUsers.add(userId);
  } catch (err) {
    initializedUsers.delete(userId);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[corsair] Auto DEK sync for user ${userId}: ${msg}`);
  }
}

/**
 * Refreshes the user's Google OAuth access token using their stored refresh token.
 * Updates the database account row AND Corsair's tenant keys with the new token.
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

      // 1. Update PostgreSQL account table
      await db
        .update(account)
        .set({
          accessToken: newAccessToken,
          accessTokenExpiresAt: newExpiresAt,
          ...(data.scope ? { scope: data.scope } : {}),
          updatedAt: new Date(),
        })
        .where(eq(account.id, googleAccount.id));

      // 2. Synchronize directly into Corsair tenant store
      try {
        const tenantClient = corsair.withTenant(userId);
        await Promise.all([
          tenantClient.gmail.keys.set_access_token(newAccessToken),
          tenantClient.gmail.keys.set_expires_at(newExpiresAt.toISOString()),
          tenantClient.googlecalendar.keys.set_access_token(newAccessToken),
          tenantClient.googlecalendar.keys.set_expires_at(newExpiresAt.toISOString()),
        ]);
      } catch {
        /* If DEKs not yet provisioned, setupUserSync will set them */
      }

      clearTenantCache();
      console.log(`[corsair] Fresh Google access token obtained and synced for user ${userId}`);
      return newAccessToken;
    } else {
      const errText = await res.text();
      console.warn(`[refreshGoogleAccessToken] Token refresh failed (${res.status}): ${errText}`);
      if (errText.includes("invalid_grant")) {
        console.warn(
          `[refreshGoogleAccessToken] Stored refresh token was revoked or expired by Google for user ${userId}. Re-authentication required.`,
        );
        try {
          await db
            .update(account)
            .set({
              accessToken: null,
              refreshToken: null,
              updatedAt: new Date(),
            })
            .where(eq(account.id, googleAccount.id));
        } catch { /* ignore db update errors */ }
        return null;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[refreshGoogleAccessToken] Error: ${msg}`);
  }

  if (isExpiringSoon && force) return null;
  return googleAccount.accessToken ?? null;
}

/**
 * Called immediately after a user signs in with Google (or lazily on first request).
 * Uses Corsair's official `setupCorsair` API to:
 *  1. Ensure a fresh access token exists (force refresh if requested)
 *  2. Create corsair_integrations + corsair_accounts rows (idempotent)
 *  3. Issue DEKs for the tenant (idempotent)
 *  4. Write the current OAuth tokens into Corsair's encrypted store
 */
export async function setupUserSync(userId: string, force = false): Promise<SyncResult> {
  // 1. Ensure access token is fresh
  const activeToken = await refreshGoogleAccessToken(userId, force);

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

  const tokenToUse = activeToken;
  if (!tokenToUse) {
    console.warn(
      `[corsair] User ${userId} Google token is revoked or expired. Skipping sync until user re-authenticates.`,
    );
    return { gmail: false, calendar: false };
  }

  // 2. Provision rows + DEKs via the official Corsair API (idempotent)
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

/**
 * Universal wrapper for any Google API operation (Gmail or Calendar).
 * If the operation fails with 401 / Unauthorized, it automatically force-refreshes
 * the user's OAuth access token with Google, re-provisions Corsair keys, and retries the operation.
 */
export async function withTokenRetry<T>(
  userId: string | undefined,
  operation: (tenant: ReturnType<typeof getTenant>) => Promise<T>,
): Promise<T> {
  const tenant = getTenant(userId);
  try {
    return await operation(tenant);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isAuthError =
      msg.includes("Unauthorized") ||
      msg.includes("401") ||
      msg.includes("invalid_grant") ||
      msg.includes("Invalid Credentials") ||
      msg.includes("AuthMissingError") ||
      msg.includes("needs credentials");

    if (isAuthError && userId) {
      console.warn(`[withTokenRetry] Auth/401 error for user ${userId} (${msg}). Force-refreshing token and retrying...`);
      const refreshedToken = await refreshGoogleAccessToken(userId, true);
      if (!refreshedToken) {
        throw new AppError("VALIDATION_ERROR", "Google session expired or revoked. Please sign in again.");
      }
      await setupUserSync(userId, true);
      const freshTenant = getTenant(userId);
      return await operation(freshTenant);
    }
    throw err;
  }
}

