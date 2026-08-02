import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { db } from "../db";
import { account } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { setupUserSync } from "../sync/service";

export const authHandler = toNodeHandler(auth);

export const authRoute = Router();

authRoute.use(async (req, res, next) => {
  try {
    await authHandler(req, res);
  } catch (error) {
    console.error("[BetterAuth Internal Error]", error);
    next(error);
  }
});

/**
 * POST /api/auth/corsair-init
 *
 * Called by the frontend immediately after a successful Google sign-in.
 * Provisions Corsair DEKs for the signed-in user so that Gmail/Calendar
 * API calls work without the "No DEK found" error.
 *
 * This is the hook point we use because Better Auth v1.3 does not expose
 * a server-side post-OAuth callback. The client calls this endpoint right
 * after the social sign-in redirects back to the app.
 */
authRoute.post("/corsair-init", async (req, res) => {
  try {
    // Verify the session via Better Auth
    const { fromNodeHeaders } = await import("better-auth/node");
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
      // Not a Google user — skip silently (email/password user)
      res.status(200).json({ data: { skipped: true, reason: "no_google_account" } });
      return;
    }

    // Provision DEKs + write tokens into Corsair's encrypted store
    const result = await setupUserSync(userId);
    console.log(`[corsair] DEK initialized for user ${userId}:`, result);

    res.status(200).json({ data: { success: true, ...result } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[corsair-init] Failed:", msg);
    // Return 200 with error details — don't block the UI from loading
    res.status(200).json({ data: { success: false, error: msg } });
  }
});
