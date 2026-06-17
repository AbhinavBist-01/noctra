import { spawn, execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getTenant } from "../corsair/tenant";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tunnelUrl: string | null = null;
let ngrokProcess: ReturnType<typeof spawn> | null = null;

// Possible locations for the ngrok binary
function findNgrokBinary(): string {
  const candidates = [
    // Local project install (pnpm)
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
    // Local project install (npm)
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
    // Global npm install
    join(
      process.env.APPDATA || "",
      "npm",
      "node_modules",
      "ngrok",
      "bin",
      "ngrok.exe",
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

export async function startNgrok(port: number = 4000): Promise<string> {
  if (tunnelUrl) {
    console.log(`[ngrok] Tunnel already active at ${tunnelUrl}`);
    return tunnelUrl;
  }

  killNgrokProcess();

  const binary = findNgrokBinary();
  console.log(`[ngrok] Using binary: ${binary}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(binary, ["start", "--none", "--log=stdout"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let startupLog = "";
    let detectedApiPort: number | null = null;
    let sessionEstablished = false;
    let resolved = false;

    function onData(data: Buffer) {
      const msg = data.toString();
      startupLog += msg;

      // Detect API port from log
      const addrMatch = msg.match(
        /starting web service.*addr=(\d+\.\d+\.\d+\.\d+):(\d+)/,
      );
      if (addrMatch) {
        detectedApiPort = parseInt(addrMatch[2]!, 10);
        console.log(`[ngrok] API on port ${detectedApiPort}`);
      }

      // Detect session established
      if (msg.includes("client session established") && !sessionEstablished) {
        sessionEstablished = true;
        console.log("[ngrok] Session established");
        if (detectedApiPort) {
          createTunnelWithRetry(detectedApiPort, port)
            .then(resolve)
            .catch(reject);
          resolved = true;
        }
      }
    }

    proc.stdout!.on("data", onData);
    proc.stderr!.on("data", onData);

    proc.on("error", (err) => {
      if (!resolved) reject(err);
    });

    proc.on("exit", (code) => {
      ngrokProcess = null;
      if (!resolved && code !== 0) {
        reject(
          new Error(
            `ngrok exited with code ${code}: ${startupLog.slice(-200)}`,
          ),
        );
      }
    });

    ngrokProcess = proc;

    // Poll for "client session established" in stdout
    const pollInterval = setInterval(() => {
      if (resolved || sessionEstablished) {
        clearInterval(pollInterval);
        return;
      }
      // Also try to detect session from stdout content
      if (startupLog.includes("client session established")) {
        sessionEstablished = true;
        clearInterval(pollInterval);
        if (detectedApiPort) {
          createTunnelWithRetry(detectedApiPort, port)
            .then(resolve)
            .catch(reject);
          resolved = true;
        }
      }
    }, 200);

    // Timeout
    setTimeout(() => {
      clearInterval(pollInterval);
      if (!resolved) {
        reject(new Error(`ngrok startup timed out: ${startupLog.slice(-300)}`));
      }
    }, 25000);
  });
}

async function createTunnelWithRetry(
  apiPort: number,
  targetPort: number,
  maxRetries = 20,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const tunnelName = randomUUID();
    try {
      const res = await fetch(`http://127.0.0.1:${apiPort}/api/tunnels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tunnelName,
          addr: `http://localhost:${targetPort}`,
          proto: "http",
        }),
      });

      if (res.ok) {
        const tunnel = await res.json();
        tunnelUrl = tunnel.public_url;
        console.log(`[ngrok] Tunnel opened: ${tunnelUrl}`);
      }

      const text = await res.text();
      // If session isn't ready yet, retry after delay
      if (text.includes("not yet ready")) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw new Error(`ngrok tunnel create failed: ${text}`);
    } catch (err: any) {
      if (err.message?.includes("not yet ready") && i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("ngrok tunnel creation timed out");
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

// --- Gmail Watch (via Pub/Sub) ---

export async function setupGmailWatch(topicName: string): Promise<void> {
  if (!tunnelUrl) throw new Error("ngrok tunnel not running");

  const tenant = getTenant();
  console.log(`[gmail-watch] Registering Watch with topic: ${topicName}`);

  const result = await tenant.gmail.api.threads.get({
    userId: "me",
    requestBody: { topicName, labelIds: ["INBOX"] },
  } as any);

  console.log(
    `[gmail-watch] Watch registered (expiration: ${result.messages})`,
  );
}

export async function stopGmailWatch(): Promise<void> {
  const tenant = getTenant();
  await tenant.gmail.api.threads.get({ userId: "me" } as any);
  console.log("[gmail-watch] Watch stopped");
}

// --- Calendar Watch (direct webhook push) ---

export async function setupCalendarWatch(): Promise<void> {
  if (!tunnelUrl) throw new Error("ngrok tunnel not running");

  const tenant = getTenant();
  const watchFn = (tenant.googlecalendar.api.events as any).watch;
  if (typeof watchFn !== "function") {
    console.log(
      "[calendar-watch] events.watch not available in corsair API, skipping",
    );
    return;
  }

  const address = `${tunnelUrl}/api/webhooks/calendar`;

  console.log(`[calendar-watch] Registering Watch → ${address}`);

  const result = await watchFn.call(tenant.googlecalendar.api.events, {
    calendarId: "primary",
    requestBody: {
      id: randomUUID(),
      type: "web_hook",
      address,
    },
  } as any);

  console.log(
    `[calendar-watch] Watch registered (expiration: ${result.expiration})`,
  );
}

export async function stopCalendarWatch(): Promise<void> {
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

  try {
    await setupCalendarWatch();
    result.calendar = true;
  } catch (err: any) {
    console.error(`[calendar-watch] Failed: ${err.message}`);
  }

  return result;
}
