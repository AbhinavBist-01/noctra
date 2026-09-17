import "dotenv/config";
import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { conn } from "./db";

const gmailPlugin = gmail();
const calendarPlugin = googlecalendar();

interface CorsairKeyContext {
  authType: string;
  keys: {
    get_access_token(): Promise<string | null | undefined>;
    get_expires_at(): Promise<string | null | undefined>;
    get_refresh_token(): Promise<string | null | undefined>;
    get_integration_credentials(): Promise<{ client_id?: string; client_secret?: string } | null | undefined>;
    set_access_token(token: string): Promise<void> | void;
    set_expires_at(expiresAt: string): Promise<void> | void;
  };
}

// Override built-in keyBuilders to perform automatic OAuth token refresh
// using refresh_token whenever token is expired, missing, or unauthorized
const makeKeyBuilder = (name: string) => {
  return async (ctx: CorsairKeyContext) => {
    if (ctx.authType !== "oauth_2") {
      const { AuthMissingError } = await import("corsair/core");
      throw new AuthMissingError(name, ctx.authType);
    }

    const [accessToken, expiresAtStr, refreshToken] = await Promise.all([
      ctx.keys.get_access_token(),
      ctx.keys.get_expires_at(),
      ctx.keys.get_refresh_token(),
    ]);

    if (!accessToken && !refreshToken) {
      const { AuthMissingError } = await import("corsair/core");
      throw new AuthMissingError(name, "oauth_2");
    }

    const integrationCreds = await ctx.keys.get_integration_credentials();
    const clientId = integrationCreds?.client_id || process.env.BETTER_AUTH_GOOGLE_CLIENT_ID;
    const clientSecret = integrationCreds?.client_secret || process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET;

    // Check if token is missing or near expiry (within 5 mins)
    const expiresAt = expiresAtStr ? new Date(expiresAtStr).getTime() : 0;
    const isExpired = expiresAt > 0 ? Date.now() >= expiresAt - 300000 : false;

    const refreshOAuthToken = async (): Promise<string | null> => {
      if (!refreshToken || !clientId || !clientSecret) return null;
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as { access_token: string; expires_in?: number };
          const newToken = json.access_token;
          await ctx.keys.set_access_token(newToken);
          let newExpiresAt: Date | undefined;
          if (json.expires_in) {
            newExpiresAt = new Date(Date.now() + json.expires_in * 1000);
            await ctx.keys.set_expires_at(newExpiresAt.toISOString());
          }

          // Synchronize back to the PostgreSQL account table
          try {
            const { db } = await import("./db");
            const { account } = await import("./db/schema");
            const { eq } = await import("drizzle-orm");
            await db
              .update(account)
              .set({
                accessToken: newToken,
                ...(newExpiresAt ? { accessTokenExpiresAt: newExpiresAt } : {}),
                updatedAt: new Date(),
              })
              .where(eq(account.refreshToken, refreshToken));
          } catch {
            /* DB sync optional if running in isolated worker */
          }

          console.log(`[corsair:${name}] Refreshed and synchronized Google OAuth access token`);
          return newToken;
        } else {
          const errBody = await res.text();
          console.warn(`[corsair:${name}] Google OAuth refresh failed (${res.status}): ${errBody}`);
          if (errBody.includes("invalid_grant")) {
            console.warn(`[corsair:${name}] Stored refresh token was revoked/expired by Google. Re-authentication required.`);
            await ctx.keys.set_access_token("");
          }
        }
      } catch (err) {
        console.warn(`[corsair:${name}] Google OAuth refresh error: ${err}`);
      }
      return null;
    };

    // Register _refreshAuth hook so Corsair's internal HTTP client can auto-retry on 401
    (ctx as any)._refreshAuth = async () => {
      const refreshed = await refreshOAuthToken();
      return refreshed ?? accessToken ?? "";
    };

    if ((isExpired || !accessToken) && refreshToken && clientId && clientSecret) {
      const refreshed = await refreshOAuthToken();
      if (refreshed) return refreshed;
    }

    return accessToken ?? "";
  };
};

(gmailPlugin as { keyBuilder?: unknown }).keyBuilder = makeKeyBuilder("gmail");
(calendarPlugin as { keyBuilder?: unknown }).keyBuilder = makeKeyBuilder("googlecalendar");

export const corsair = createCorsair({
  plugins: [gmailPlugin, calendarPlugin],
  database: conn,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: true,
});

// Seed integration-level OAuth app credentials into Corsair DB cleanly
export async function initCorsairIntegrationKeys(): Promise<void> {
  try {
    if (process.env.BETTER_AUTH_GOOGLE_CLIENT_ID && process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET) {
      await corsair.keys.gmail.set_client_id(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID).catch(() => {});
      await corsair.keys.gmail.set_client_secret(process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET).catch(() => {});
      await corsair.keys.googlecalendar.set_client_id(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID).catch(() => {});
      await corsair.keys.googlecalendar.set_client_secret(process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET).catch(() => {});
    }

    if (process.env.GMAIL_PUBSUB_TOPIC) {
      await (corsair.keys.gmail as any).set_topic_id?.(process.env.GMAIL_PUBSUB_TOPIC).catch(() => {});
    }
  } catch {
    /* ignore initialization warning during cold start */
  }
}

void initCorsairIntegrationKeys();
