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

    if ((isExpired || !accessToken) && refreshToken && clientId && clientSecret) {
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
          if (json.expires_in) {
            const newExpiry = new Date(Date.now() + json.expires_in * 1000).toISOString();
            await ctx.keys.set_expires_at(newExpiry);
          }
          console.log(`[corsair:${name}] Refreshed expired Google OAuth access token`);
          return newToken;
        } else {
          const errBody = await res.text();
          console.warn(`[corsair:${name}] Google OAuth refresh failed (${res.status}): ${errBody}`);
        }
      } catch (err) {
        console.warn(`[corsair:${name}] Google OAuth refresh error: ${err}`);
      }
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

// Seed integration-level OAuth app credentials into Corsair DB
if (process.env.BETTER_AUTH_GOOGLE_CLIENT_ID && process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET) {
  corsair.keys.gmail.set_client_id(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID).catch(() => {});
  corsair.keys.gmail.set_client_secret(process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET).catch(() => {});
  corsair.keys.googlecalendar.set_client_id(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID).catch(() => {});
  corsair.keys.googlecalendar.set_client_secret(process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET).catch(() => {});
}
