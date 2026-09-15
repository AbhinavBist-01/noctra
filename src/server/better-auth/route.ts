import { Router } from "express";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import { db } from "../db";
import { account } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { setupUserSync, refreshGoogleAccessToken } from "../sync/service";
import { setupWatches } from "../webhooks/ngrok";

export const authHandler = toNodeHandler(auth);

export const authRoute = Router();

/**
 * POST /api/auth/corsair-init
 *
 * Explicit hook point to provision Corsair DEKs and fresh tokens.
 * Must be registered BEFORE the catch-all authHandler to prevent 404 interception.
 */
authRoute.post("/corsair-init", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const userId = session.user.id;

    // Check if user has a Google account linked
    const googleAccount = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!googleAccount) {
      res.status(200).json({ data: { skipped: true, reason: "no_google_account" } });
      return;
    }

    // Refresh access token and sync with Corsair DEKs
    await refreshGoogleAccessToken(userId, true);
    const syncResult = await setupUserSync(userId);

    // Register webhooks automatically if ngrok tunnel is open
    let watchResult = { gmail: false, calendar: false };
    try {
      watchResult = await setupWatches(userId);
    } catch (watchErr) {
      console.warn("[corsair-init] Watch registration warning:", watchErr);
    }

    console.log(`[corsair-init] Completed for user ${userId}:`, { syncResult, watchResult });

    res.status(200).json({
      data: {
        success: true,
        ...syncResult,
        watches: watchResult,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[corsair-init] Failed:", msg);
    res.status(200).json({ data: { success: false, error: msg } });
  }
});

/**
 * POST /api/auth/token/refresh
 *
 * Allows manual or automated token refresh on demand.
 */
authRoute.post("/token/refresh", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const token = await refreshGoogleAccessToken(session.user.id, true);
    if (!token) {
      res.status(400).json({ error: "No Google account or refresh token available" });
      return;
    }

    await setupUserSync(session.user.id);
    await setupWatches(session.user.id).catch(() => {});

    res.status(200).json({ data: { success: true } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /callback/google
 *
 * Specific interceptor for Google OAuth callback to ensure fresh token,
 * DEK sync, and automatic webhook registration immediately upon login
 * without requiring any user click.
 */
authRoute.get("/callback/google", async (req, res, next) => {
  res.on("finish", async () => {
    if (res.statusCode < 400) {
      try {
        console.log("[authRoute] Google OAuth callback finished, running automatic token sync & webhook setup...");
        
        // Find the latest active Google account
        const googleAccounts = await db
          .select()
          .from(account)
          .where(eq(account.providerId, "google"));

        if (googleAccounts.length > 0) {
          // Sort by latest updated
          googleAccounts.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
          const latest = googleAccounts[0]!;
          
          console.log(`[authRoute] Auto-syncing fresh tokens and watches for user ${latest.userId}...`);
          await refreshGoogleAccessToken(latest.userId, false);
          await setupUserSync(latest.userId);
          
          await setupWatches(latest.userId).catch((err) => {
            console.warn("[authRoute] Auto watch registration notice:", err instanceof Error ? err.message : err);
          });
        }
      } catch (err) {
        console.error("[authRoute] Post-callback auto-sync error:", err);
      }
    }
  });

  try {
    await authHandler(req, res);
  } catch (error) {
    console.error("[BetterAuth Internal Error]", error);
    next(error);
  }
});

/**
 * Catch-all for Better Auth internal endpoints
 */
authRoute.use(async (req, res, next) => {
  try {
    await authHandler(req, res);
  } catch (error) {
    console.error("[BetterAuth Internal Error]", error);
    next(error);
  }
});
