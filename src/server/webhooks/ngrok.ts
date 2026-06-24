import { spawn, execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getTenant } from "../corsair/tenant";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tunnelUrl: string | null = null;
let ngrokProcess: ReturnType<typeof spawn> | null = null;

function findNgrokBinary(): string {
  const candidates = [
    join(__dirname, "..", "..", "..", "node_modules", ".pnpm", "ngrok@5.0.0-beta.2", "node_modules", "ngrok", "bin", "ngrok.exe"),
    join(__dirname, "..", "..", "..", "node_modules", "ngrok", "bin", "ngrok.exe"),
    join(process.env.APPDATA || "", "npm", "node_modules", "ngrok", "bin", "ngrok.exe"),
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
    const proc = spawn(binary, ["http", String(port), "--log=stdout"], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let startupLog = "";
    let resolved = false;

    function onData(data: Buffer) {
      const msg = data.toString();
      startupLog += msg;

      // v3 format: url=https://xxxx.ngrok-free.app
      const urlMatch = msg.match(/url=https:\/\/([^\s]+)/);
      if (urlMatch && !resolved) {
        tunnelUrl = `https://${urlMatch[1]}`;
        resolved = true;
        console.log(`[ngrok] Tunnel opened: ${tunnelUrl}`);
        resolve(tunnelUrl);
      }

      // v2 format: Forwarding https://xxxx.ngrok.io -> http://localhost:PORT
      const fwdMatch = msg.match(/Forwarding\s+(https:\/\/[^\s]+)/);
      if (fwdMatch && !resolved) {
        tunnelUrl = fwdMatch[1] ?? null;
        resolved = true;
        console.log(`[ngrok] Tunnel opened: ${tunnelUrl}`);
        resolve(tunnelUrl!);
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
        reject(new Error(`ngrok exited with code ${code}: ${startupLog.slice(-300)}`));
      }
    });

    ngrokProcess = proc;

    const pollInterval = setInterval(() => {
      if (resolved) { clearInterval(pollInterval); return; }
      // Check accumulated log for URL patterns
      const urlMatch = startupLog.match(/url=https:\/\/([^\s]+)/);
      if (urlMatch && !resolved) {
        tunnelUrl = `https://${urlMatch[1]}`;
        resolved = true;
        clearInterval(pollInterval);
        resolve(tunnelUrl);
        return;
      }
      const fwdMatch = startupLog.match(/Forwarding\s+(https:\/\/[^\s]+)/);
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

export async function setupGmailWatch(topicName: string): Promise<void> {
  console.log(`[gmail-watch] Skipping watch registration (topic: ${topicName}). Webhook watches are managed externally.`);
}

export async function stopGmailWatch(): Promise<void> {
  console.log("[gmail-watch] Stopping watch (skipped)");
}

// --- Calendar Watch ---

export async function setupCalendarWatch(): Promise<void> {
  console.log("[calendar-watch] Skipping watch registration. Webhook watches are managed externally.");
}

export async function stopCalendarWatch(): Promise<void> {
  console.log("[calendar-watch] Stopping calendar watch (skipped)");
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
