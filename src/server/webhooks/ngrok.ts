import ngrok from "ngrok";
import { getTenant } from "../corsair/tenant";
import { randomUUID } from "node:crypto";

let tunnelUrl: string | null = null;

export async function startNgrok(port: number = 4000): Promise<string> {
  if (tunnelUrl) {
    console.log(`[ngrok] Tunnel already active at ${tunnelUrl}`);
    return tunnelUrl;
  }

  try {
    tunnelUrl = await ngrok.connect({
      addr: port,
      proto: "http",
      onStatusChange: (status) => {
        console.log(`[ngrok] Status: ${status}`);
        if (status === "closed") tunnelUrl = null;
      },
      onLogEvent: (msg) => console.log(`[ngrok] ${msg}`),
    });
    console.log(`[ngrok] Tunnel opened: ${tunnelUrl}`);
    return tunnelUrl;
  } catch (err) {
    console.error("[ngrok] Failed to start:", (err as Error).message);
    throw err;
  }
}

export async function stopNgrok(): Promise<void> {
  if (!tunnelUrl) return;
  await ngrok.disconnect(tunnelUrl);
  await ngrok.kill();
  tunnelUrl = null;
  console.log("[ngrok] Tunnel closed");
}

export function getNgrokUrl(): string | null {
  return tunnelUrl;
}

// --- Gmail Watch (via Pub/Sub) ---

export async function setupGmailWatch(topicName: string): Promise<void> {
  if (!tunnelUrl) throw new Error("ngrok tunnel not running");

  const tenant = getTenant();
  console.log(`[gmail-watch] Registering Watch with topic: ${topicName}`);

  const result = await tenant.gmail.api.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: ["INBOX"],
    },
  } as any);

  console.log(`[gmail-watch] Watch registered (expiration: ${result.expiration})`);
}

export async function stopGmailWatch(): Promise<void> {
  const tenant = getTenant();
  await tenant.gmail.api.users.stop({ userId: "me" } as any);
  console.log("[gmail-watch] Watch stopped");
}

// --- Calendar Watch (direct webhook push) ---

export async function setupCalendarWatch(): Promise<void> {
  if (!tunnelUrl) throw new Error("ngrok tunnel not running");

  const tenant = getTenant();
  const address = `${tunnelUrl}/api/webhooks/calendar`;

  console.log(`[calendar-watch] Registering Watch → ${address}`);

  const result = await tenant.googlecalendar.api.events.watch({
    calendarId: "primary",
    requestBody: {
      id: randomUUID(),
      type: "web_hook",
      address,
    },
  } as any);

  console.log(`[calendar-watch] Watch registered (expiration: ${result.expiration})`);
}

export async function stopCalendarWatch(): Promise<void> {
  const tenant = getTenant();

  // We'd need to track channel IDs to stop them properly
  // For now, just log — Calendar channels auto-expire after ~7 days
  console.log("[calendar-watch] Calendar watch will expire automatically");
}

// --- Combined setup ---

export type WatchResult = {
  gmail: boolean;
  calendar: boolean;
};

export async function setupWatches(): Promise<WatchResult> {
  if (!tunnelUrl) throw new Error("ngrok tunnel not running");

  const result: WatchResult = { gmail: false, calendar: false };

  // Gmail — requires Pub/Sub topic
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (topicName) {
    try {
      await setupGmailWatch(topicName);
      result.gmail = true;
    } catch (err: any) {
      console.error(`[gmail-watch] Failed: ${err.message}`);
    }
  } else {
    console.log("[webhooks] Set GMAIL_PUBSUB_TOPIC to enable Gmail Watch");
  }

  // Calendar — direct webhook push (no Pub/Sub needed)
  try {
    await setupCalendarWatch();
    result.calendar = true;
  } catch (err: any) {
    console.error(`[calendar-watch] Failed: ${err.message}`);
  }

  return result;
}
