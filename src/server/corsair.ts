import "dotenv/config";
import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { conn } from "./db";

const gmailPlugin = gmail();
const calendarPlugin = googlecalendar();

// Override built-in keyBuilders to tolerate missing refresh_token
// (needed until user re-auths to get a refresh_token from Google)
const makeKeyBuilder = (name: string) => {
  return async (ctx: any) => {
    if (ctx.authType !== "oauth_2") {
      const { AuthMissingError } = await import("corsair/core");
      throw new AuthMissingError(name, ctx.authType);
    }

    const [accessToken, expiresAt, refreshToken] = await Promise.all([
      ctx.keys.get_access_token(),
      ctx.keys.get_expires_at(),
      ctx.keys.get_refresh_token(),
    ]);

    if (!accessToken) {
      const { AuthMissingError } = await import("corsair/core");
      throw new AuthMissingError(name, "oauth_2");
    }

    // If we have a refresh_token, use the standard refresh flow
    if (refreshToken) {
      const integrationCreds = await ctx.keys.get_integration_credentials();
      if (integrationCreds?.client_id && integrationCreds?.client_secret) {
        try {
          const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: integrationCreds.client_id,
              client_secret: integrationCreds.client_secret,
              refresh_token: refreshToken,
              grant_type: "refresh_token",
            }),
          });
          if (res.ok) {
            const json = await res.json();
            const newToken: string = json.access_token;
            ctx.keys.set_access_token(newToken);
            if (json.expires_in) {
              ctx.keys.set_expires_at(String(Math.floor(Date.now() / 1000) + json.expires_in));
            }
            return newToken;
          }
        } catch {
          // fall through to return existing token
        }
      }
    }

    // No refresh_token or refresh failed — return current access token as-is
    return accessToken;
  };
};

(gmailPlugin as any).keyBuilder = makeKeyBuilder("gmail");
(calendarPlugin as any).keyBuilder = makeKeyBuilder("googlecalendar");

export const corsair = createCorsair({
  plugins: [gmailPlugin, calendarPlugin],
  database: conn,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: true,
});
