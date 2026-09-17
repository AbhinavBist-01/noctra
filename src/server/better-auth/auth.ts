import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "noctra-dev-secret-change-in-production",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    appUrl,
  ].filter(Boolean) as string[],

  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          console.log(`[better-auth] Session created for user ${session.userId}, ensuring fresh token and webhooks...`);
          try {
            const { setupUserSync } = await import("../sync/service");
            const { setupWatches } = await import("../webhooks/ngrok");
            await setupUserSync(session.userId);
            await setupWatches(session.userId).catch(() => {});
          } catch (e) {
            console.warn("[better-auth hook] Note:", e instanceof Error ? e.message : e);
          }
        },
      },
    },
    account: {
      create: {
        after: async (acc) => {
          if (acc.providerId === "google") {
            console.log(`[better-auth] Google account linked for user ${acc.userId}, ensuring fresh token and webhooks...`);
            try {
              const { setupUserSync } = await import("../sync/service");
              const { setupWatches } = await import("../webhooks/ngrok");
              await setupUserSync(acc.userId);
              await setupWatches(acc.userId).catch(() => {});
            } catch (e) {
              console.warn("[better-auth hook] Note:", e instanceof Error ? e.message : e);
            }
          }
        },
      },
      update: {
        after: async (acc) => {
          if (acc.providerId === "google") {
            console.log(`[better-auth] Google account updated for user ${acc.userId}, ensuring fresh token and webhooks...`);
            try {
              const { setupUserSync } = await import("../sync/service");
              const { setupWatches } = await import("../webhooks/ngrok");
              await setupUserSync(acc.userId);
              await setupWatches(acc.userId).catch(() => {});
            } catch (e) {
              console.warn("[better-auth hook] Note:", e instanceof Error ? e.message : e);
            }
          }
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET || "",
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    },
  },
});
