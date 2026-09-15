import { spawn, execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db";
import { account } from "../db/schema";
import { eq } from "drizzle-orm";
import { refreshGoogleAccessToken } from "../sync/service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tunnelUrl: string | null = null;
let ngrokProcess: ReturnType<typeof spawn> | null = null;

// Track active watches to prevent redundant watch calls
const activeWatches = new Map<
  string,
  {
    gmailExpiration?: string;
    calendarChannelId?: string;
    calendarResourceId?: string;
    registeredAt: number;
  }
>();

function findNgrokBinary(): string {
  const candidates = [
    join(
      process.env.APPDATA || "",
      "npm",
      "node_modules",
      "ngrok",
      "bin",
      "ngrok.exe",
    ),
    join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      ".pnpm",
      "ngrok@5.0.0-beta.2",
      "node_modules",
      "ngrok",
      "bin",
      "ngrok.exe",
    ),
    join(
      __dirname,
      "..",
      "..",
      "..",
      "node_modules",
      "ngrok",
      "bin",
      "ngrok.exe",
    ),
    join(
      process.env.APPDATA || "",
      "npm",
      "node_modules",
      "ngrok",
      "bin",
      "ngrok.cmd",
    ),
  ];

  for (const p of candidates) {
    try {
      execSync(`"${p}" version`, { stdio: "pipe", timeout: 3000 });
      return p;
    } catch {
      continue;
    }
  }

  return "ngrok";
}

function killNgrokProcess(): void {
  try {
    execSync("taskkill /f /im ngrok.exe 2>nul", { stdio: "ignore" });
  } catch {
    // no stale process
  }
}

export async function startNgrok(port = 4000): Promise<string> {
  if (tunnelUrl) {
    console.log(`[ngrok] Tunnel already active at ${tunnelUrl}`);
    return tunnelUrl;
  }

  killNgrokProcess();

  const binary = findNgrokBinary();
  console.log(`[ngrok] Using binary: ${binary}`);

  const authToken = process.env.NGROK_AUTH_TOKEN || process.env.NGROK_AUTHTOKEN;
  const isCmdOrBatch = binary.endsWith(".cmd") || binary === "ngrok";

  return new Promise((resolve, reject) => {
    const proc = spawn(binary, ["http", String(port), "--log=stdout"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ...(authToken ? { NGROK_AUTHTOKEN: authToken } : {}),
      },
      shell: isCmdOrBatch,
    });

    let startupLog = "";
    let resolved = false;

    function onData(data: Buffer) {
      const msg = data.toString();
      startupLog += msg;

      // v3 format: url=https://xxxx.ngrok-free.app or url=https://xxxx.ngrok-free.dev
      const urlMatch = /url=https:\/\/([^\s]+)/.exec(msg);
      if (urlMatch && !resolved) {
        tunnelUrl = `https://${urlMatch[1]}`;
        resolved = true;
        console.log(`[ngrok] Tunnel opened: ${tunnelUrl}`);
        resolve(tunnelUrl);
      }

      // v2 format: Forwarding https://xxxx.ngrok.io -> http://localhost:PORT
      const fwdMatch = /Forwarding\s+(https:\/\/[^\s]+)/.exec(msg);
      if (fwdMatch && !resolved) {
        tunnelUrl = fwdMatch[1] ?? null;
        resolved = true;
        console.log(`[ngrok] Tunnel opened: ${tunnelUrl}`);
        resolve(tunnelUrl!);
      }
    }

    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);

    proc.on("error", (err) => {
      if (!resolved) reject(err);
    });

    proc.on("exit", (code) => {
      ngrokProcess = null;
      if (!resolved && code !== 0) {
        reject(
          new Error(
            `ngrok exited with code ${code}: ${startupLog.slice(-300)}`,
          ),
        );
      }
    });

    ngrokProcess = proc;

    const pollInterval = setInterval(() => {
      if (resolved) {
        clearInterval(pollInterval);
        return;
      }
      const urlMatch = /url=https:\/\/([^\s]+)/.exec(startupLog);
      if (urlMatch && !resolved) {
        tunnelUrl = `https://${urlMatch[1]}`;
        resolved = true;
        clearInterval(pollInterval);
        resolve(tunnelUrl);
        return;
      }
      const fwdMatch = /Forwarding\s+(https:\/\/[^\s]+)/.exec(startupLog);
      if (fwdMatch && !resolved) {
        tunnelUrl = fwdMatch[1] ?? null;
        resolved = true;
        clearInterval(pollInterval);
        resolve(tunnelUrl!);
        return;
      }
    }, 200);

    setTimeout(() => {
      clearInterval(pollInterval);
      if (!resolved) {
        reject(new Error(`ngrok tunnel timed out: ${startupLog.slice(-400)}`));
      }
    }, 30000);
  });
}

export async function stopNgrok(): Promise<void> {
  tunnelUrl = null;
  if (ngrokProcess) {
    ngrokProcess.kill();
    ngrokProcess = null;
  }
  killNgrokProcess();
  console.log("[ngrok] Tunnel closed");
}

export function getNgrokUrl(): string | null {
  return tunnelUrl;
}

// --- Gmail Watch ---

/**
 * Registers a push notification watch on the user's Gmail inbox.
 * Tells Google to send change events to the specified Cloud Pub/Sub topic.
 */
export async function setupGmailWatch(
  accessToken: string,
  topicName: string,
): Promise<{ historyId: string; expiration: string }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail watch registration failed (${res.status}): ${errText}`);
  }

  try {
    const { corsair } = await import("../corsair");
    await (corsair.keys.gmail as any).set_topic_id?.(topicName);
  } catch {
    /* ignore if not supported on root keys */
  }

  return data;
}

export async function stopGmailWatch(accessToken: string): Promise<void> {
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      console.log("[gmail-watch] Successfully stopped Gmail watch");
    }
  } catch (err) {
    console.warn("[gmail-watch] Error stopping watch:", err);
  }
}

// --- Calendar Watch ---

/**
 * Registers a push notification watch on the user's Primary Google Calendar.
 * Tells Google to send POST requests to our public webhook address when calendar events change.
 */
export async function setupCalendarWatch(
  accessToken: string,
  tunnelBaseUrl: string,
): Promise<{ id: string; resourceId: string; expiration: string }> {
  const channelId = crypto.randomUUID();
  const webhookUrl = `${tunnelBaseUrl}/api/webhooks/calendar`;

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Calendar watch registration failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { id: string; resourceId: string; expiration: string };
  console.log(
    `[calendar-watch] Active on ${webhookUrl}! Channel: ${data.id}, Resource: ${data.resourceId}`,
  );
  return data;
}

// --- Combined setup ---

export type WatchResult = {
  gmail: boolean;
  calendar: boolean;
};

/**
 * Ensures watches (Gmail + Calendar) are registered for a given user or all users in the DB.
 * Automatically refreshes the user's access token before calling Google's API to ensure no 401s.
 */
export async function setupWatches(userId?: string): Promise<WatchResult> {
  if (!tunnelUrl) {
    console.log("[webhooks] ngrok tunnel not open, skipping watch setup");
    return { gmail: false, calendar: false };
  }

  // Find target accounts
  const query = db
    .select()
    .from(account)
    .where(eq(account.providerId, "google"));

  const googleAccounts = await query;
  const accountsToWatch = userId
    ? googleAccounts.filter((a) => a.userId === userId)
    : googleAccounts;

  if (accountsToWatch.length === 0) {
    console.log("[webhooks] No Google accounts available to register watches for");
    return { gmail: false, calendar: false };
  }

  let anyGmailSuccess = false;
  let anyCalendarSuccess = false;
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;

  for (const acc of accountsToWatch) {
    try {
      // 1. Ensure access token is valid and fresh
      const token = await refreshGoogleAccessToken(acc.userId);
      if (!token) {
        console.warn(`[webhooks] No valid access token for user ${acc.userId}, skipping`);
        continue;
      }

      // Check if user was registered recently (within 10 minutes)
      const existing = activeWatches.get(acc.userId);
      const isRecent = existing && Date.now() - existing.registeredAt < 600000;

      // 2. Gmail Watch
      if (topicName) {
        try {
          const gmailResult = await setupGmailWatch(token, topicName);
          anyGmailSuccess = true;
          activeWatches.set(acc.userId, {
            ...activeWatches.get(acc.userId),
            gmailExpiration: gmailResult.expiration,
            registeredAt: Date.now(),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[gmail-watch] Failed for user ${acc.userId}: ${msg}`);
        }
      } else {
        console.log("[webhooks] Set GMAIL_PUBSUB_TOPIC in .env to enable Gmail Watch");
      }

      // 3. Calendar Watch
      if (!isRecent || !existing?.calendarChannelId) {
        try {
          const calResult = await setupCalendarWatch(token, tunnelUrl);
          anyCalendarSuccess = true;
          activeWatches.set(acc.userId, {
            ...activeWatches.get(acc.userId),
            calendarChannelId: calResult.id,
            calendarResourceId: calResult.resourceId,
            registeredAt: Date.now(),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[calendar-watch] Failed for user ${acc.userId}: ${msg}`);
        }
      } else {
        anyCalendarSuccess = true;
      }
    } catch (err) {
      console.error(`[webhooks] Error processing watches for user ${acc.userId}:`, err);
    }
  }

  return { gmail: anyGmailSuccess, calendar: anyCalendarSuccess };
}
