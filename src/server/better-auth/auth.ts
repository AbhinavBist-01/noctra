import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { google } from "better-auth/social-providers";
import { db } from "../db"; // your drizzle instance
import * as schema from "../db/schema"; // your drizzle schema

export const auth = betterAuth({
  baseURL: "http://localhost:4000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: ["http://localhost:3000"],

  account: {
    storeStateStrategy: "cookie",
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!,
      // CRITICAL: Declare scopes upfront
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify", // for mark read/archive
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      authorization: {
        params: {
          accessType: "offline",
          prompt: "select_account consent",
        },
      },
    },
  },
});
