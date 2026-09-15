import "dotenv/config";
import { app } from "./app";
import { db } from "./db";
import { account } from "./db/schema";
import { eq } from "drizzle-orm";
import { setupUserSync } from "./sync/service";
import { startNgrok, stopNgrok, setupWatches } from "./webhooks/ngrok";
import { refreshGmailMessages } from "./gmail/service";
import { refreshCalendarEvents } from "./calendar/service";

const PORT = process.env.EXPRESS_PORT ?? 4000;

async function initWebhooks(): Promise<void> {
  const enableNgrok =
    process.env.NGROK_ENABLED === "true" ||
    process.env.NGROK_AUTH_TOKEN !== undefined;

  if (enableNgrok) {
    try {
      await startNgrok(Number(PORT));
      await setupWatches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[webhooks] Skipped: ${msg}`);
    }
  }
}

app.listen(PORT, async () => {
  console.log(`[Express] Server running on http://localhost:${PORT}`);

  // Pre-load Google integration keys at boot time for all Google accounts in DB.
  // This handles server restarts where users are already signed in.
  try {
    const googleAccounts = await db
      .select()
      .from(account)
      .where(eq(account.providerId, "google"));

    if (googleAccounts.length > 0) {
      for (const acc of googleAccounts) {
        if (!acc.accessToken && !acc.refreshToken) continue;
        console.log(`[corsair] Initializing DEKs for user ${acc.userId}...`);
        await setupUserSync(acc.userId);
      }
      console.log("[corsair] Boot DEKs initialized — Gmail & Calendar ready");
    } else {
      console.log("[corsair] No Google accounts in DB yet — DEKs will be initialized lazily on first request");
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[corsair] Boot-time DEK initialization warning: ${msg}`);
  }

  await initWebhooks();

  // Background auto-sync interval (every 45 seconds).
  setInterval(async () => {
    try {
      const googleAccounts = await db
        .select()
        .from(account)
        .where(eq(account.providerId, "google"));

      for (const acc of googleAccounts) {
        if (!acc.accessToken && !acc.refreshToken) continue;
        try {
          await refreshGmailMessages(acc.userId);
          await refreshCalendarEvents(acc.userId);
        } catch (accErr: unknown) {
          const msg = accErr instanceof Error ? accErr.message : String(accErr);
          if (
            !msg.includes("No DEK found") &&
            !msg.includes("invalid_grant") &&
            !msg.includes("Unauthorized") &&
            !msg.includes("401")
          ) {
            console.warn(`[Auto-Sync] Warning for user ${acc.userId}: ${msg}`);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("No DEK found")) {
        console.warn(`[Auto-Sync] Warning: ${msg}`);
      }
    }
  }, 45000);
});

process.on("SIGINT", async () => {
  console.log("\n[server] Shutting down...");
  await stopNgrok();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[server] Shutting down...");
  await stopNgrok();
  process.exit(0);
});
