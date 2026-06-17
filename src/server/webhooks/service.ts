import { processWebhook as corsairProcessWebhook } from "corsair";
import { corsair } from "../corsair";

// In-memory webhook activity log (last 100 entries)
type WebhookLogEntry = {
  id: string;
  timestamp: string;
  type: "gmail" | "calendar" | "unknown";
  event: string;
  status: "success" | "error";
  detail?: string;
};

const webhookLog: WebhookLogEntry[] = [];
const MAX_LOG_ENTRIES = 100;

function addWebhookLog(entry: Omit<WebhookLogEntry, "id" | "timestamp">) {
  webhookLog.unshift({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
  if (webhookLog.length > MAX_LOG_ENTRIES) webhookLog.length = MAX_LOG_ENTRIES;
  console.log(`[WEBHOOK LOG] ${entry.type} ${entry.event} → ${entry.status}${entry.detail ? ` (${entry.detail})` : ""}`);
}

export function getWebhookLog(limit = 50) {
  return webhookLog.slice(0, limit);
}

// Pub/Sub push subscription wraps the payload in a "message" envelope
function decodePubSubBody(
  body: Record<string, unknown> | string,
): Record<string, unknown> | string {
  if (typeof body !== "object" || !body) return body;

  const msg = body as Record<string, any>;
  if (!msg.message || !msg.subscription) return body;

  console.log("[WEBHOOK] Pub/Sub notification detected");

  const encoded = msg.message.data;
  if (typeof encoded !== "string") return body;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    console.log(`[WEBHOOK] Decoded payload: ${decoded}`);
    return JSON.parse(decoded);
  } catch (e) {
    console.error("[WEBHOOK] Failed to decode Pub/Sub data:", e);
    return body;
  }
}

function detectWebhookType(
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | string,
): { type: WebhookLogEntry["type"]; event: string } {
  if (typeof body === "string") return { type: "unknown", event: "raw_string" };
  const b = body as Record<string, any>;

  // Gmail Pub/Sub notification
  if (b.historyId || b.emailAddress) {
    return { type: "gmail", event: b.historyId ? `historyId:${b.historyId}` : "inbox_change" };
  }

  // Google Calendar push notification
  if (b.resourceId || b.syncToken) {
    return { type: "calendar", event: b.resourceId ?? "sync" };
  }

  // X-Goog-Header detection
  const googHeaders = Object.keys(headers).filter((h) => h.toLowerCase().startsWith("x-goog"));
  if (googHeaders.length > 0) {
    return { type: "gmail", event: "goog_header" };
  }

  return { type: "unknown", event: Object.keys(b).slice(0, 3).join(",") || "empty" };
}

export const processWebhook = async (
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | string,
  query?: { tenantId?: string; [x: string]: string | string[] | undefined },
) => {
  console.log("[WEBHOOK] Received");

  const { type, event } = detectWebhookType(headers, body);

  // Decode Pub/Sub envelope if present
  const decodedBody = decodePubSubBody(body);

  try {
    const result = await corsairProcessWebhook(
      corsair,
      headers,
      decodedBody,
      query,
    );

    if (result.plugin) {
      addWebhookLog({ type, event: `${result.plugin}.${result.action}`, status: "success" });
      console.log(`[WEBHOOK] Handled by ${result.plugin}.${result.action}`);
    } else {
      addWebhookLog({ type, event, status: "success", detail: "no plugin matched" });
      console.log(`[WEBHOOK] No plugin matched for ${type}:${event}`);
    }
    return result;
  } catch (error: any) {
    addWebhookLog({ type, event, status: "error", detail: error?.message ?? "unknown" });
    console.error(`[WEBHOOK] Error processing ${type}:${event}:`, error?.message);
    throw error;
  }
};

export const verifyWebhook = async (_query: unknown) => {
  return { verified: true };
};
