import "dotenv/config";
import { app } from "./app";
import { getTenant } from "./corsair/tenant";
import { startNgrok, stopNgrok, setupWatches } from "./webhooks/ngrok";

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

app.listen(PORT, async () => {
  try {
    await tenant.gmail.api.messages.list({ maxResults: 1 } as any);
    console.log("[corsair] Gmail integration ready");
  } catch (e: any) {
    console.log(`[corsair] Gmail integration not ready: ${e.message}`);
  }
  console.log(`[Express] Server running on http://localhost:${PORT}`);

  await initWebhooks();
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
