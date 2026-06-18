import "dotenv/config";
import { app } from "./app";
import { getTenant } from "./corsair/tenant";
import { startNgrok, stopNgrok, setupWatches } from "./webhooks/ngrok";
import { db } from "./db";
import { account } from "./db/schema";
import { eq } from "drizzle-orm";
import { setupUserSync } from "./sync/service";

const PORT = process.env.EXPRESS_PORT ?? 4000;

async function initWebhooks(): Promise<void> {
  const enableNgrok =
    process.env.NGROK_ENABLED === "true" ||
    process.env.NGROK_AUTH_TOKEN !== undefined;

  if (enableNgrok) {
    try {
      await startNgrok(Number(PORT));
      await setupWatches();
    } catch (err: any) {
      console.log(`[webhooks] Skipped: ${err.message}`);
    }
  }
}

const tenant = getTenant();

import { refreshGmailMessages } from "./gmail/service";
import { refreshCalendarEvents } from "./calendar/service";

app.listen(PORT, async () => {
  console.log(`[Express] Server running on http://localhost:${PORT}`);

  // Try to pre-load Google integration keys for background sync
  try {
    const googleAccount = await db
      .select()
      .from(account)
      .where(eq(account.providerId, "google"))
      .limit(1)
      .then((rows) => rows[0] ?? null);
    if (googleAccount) {
      await setupUserSync(googleAccount.userId);
      console.log("[corsair] Pre-loaded Google credentials from database");
      
      // Test connection
      await tenant.gmail.api.messages.list({ maxResults: 1 } as any);
      console.log("[corsair] Gmail integration ready");
    } else {
      console.log("[corsair] No Google integration credentials found in database yet");
    }
  } catch (e: any) {
    console.log(`[corsair] Gmail integration check failed: ${e.message}`);
  }

  await initWebhooks();

  // Background auto-sync interval (runs every 45 seconds)
  setInterval(async () => {
    try {
      const googleAccount = await db
        .select()
        .from(account)
        .where(eq(account.providerId, "google"))
        .limit(1)
        .then((rows) => rows[0] ?? null);
      if (!googleAccount) {
        console.log("[Auto-Sync] No linked Google account found. Skipping.");
        return;
      }
      
      // Reload/ensure keys are cached in-memory and refreshed if expired
      await setupUserSync(googleAccount.userId);
      
      await refreshGmailMessages();
      await refreshCalendarEvents();
      console.log("[Auto-Sync] Synced Gmail & Calendar");
    } catch (err: any) {
      console.log(`[Auto-Sync] Warning: ${err.message}`);
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
