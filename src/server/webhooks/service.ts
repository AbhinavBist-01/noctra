import { processWebhook as corsairProcessWebhook } from "corsair";
import { corsair } from "../corsair";
import { getTenant } from "../corsair/tenant";

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

  if (b.historyId || b.emailAddress) {
    return { type: "gmail", event: b.historyId ? `historyId:${b.historyId}` : "inbox_change" };
  }

  if (b.resourceId || b.syncToken) {
    return { type: "calendar", event: b.resourceId ?? "sync" };
  }

  return { type: "unknown", event: Object.keys(b).slice(0, 3).join(",") || "empty" };
}

async function handleGmailNotification(historyId: string) {
  const tenant = getTenant();
  console.log(`[WEBHOOK] Fetching messages after historyId ${historyId}`);
  try {
    const listRes = await tenant.gmail.api.messages.list({ maxResults: 20 } as any);
    const items = (listRes as any)?.messages ?? [];
    let fetched = 0;
    for (const item of items) {
      if (item?.id) {
        try {
          const res = await tenant.gmail.api.messages.get({ id: item.id } as any);
          const data = res.data ?? res;
          if (data) {
            await tenant.gmail.db.messages.upsertByEntityId(item.id, data);
          }
          fetched++;
        } catch { /* skip individual failures */ }
      }
    }
    console.log(`[WEBHOOK] Fetched and cached ${fetched} messages`);
    return fetched;
  } catch (error: any) {
    console.error(`[WEBHOOK] Failed to fetch messages:`, error?.message);
    throw error;
  }
}

export const processWebhook = async (
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | string,
  query?: { tenantId?: string; [x: string]: string | string[] | undefined },
) => {
  console.log("[WEBHOOK] Received");

  // Decode Pub/Sub envelope if present
  const decodedBody = decodePubSubBody(body);
  const decoded = typeof decodedBody === "object" && decodedBody !== null ? decodedBody as Record<string, any> : null;
  const { type, event } = detectWebhookType(headers, decoded ?? body);

  // Try corsair webhook processing first
  try {
    const result = await corsairProcessWebhook(corsair, headers, decodedBody, query);
    if (result.plugin) {
      addWebhookLog({ type, event: `${result.plugin}.${result.action}`, status: "success" });
      console.log(`[WEBHOOK] Handled by ${result.plugin}.${result.action}`);
      return result;
    }
  } catch (error: any) {
    console.log(`[WEBHOOK] corsairProcessWebhook failed: ${error?.message}, falling back to manual handler`);
  }

  // Fallback: handle Gmail notifications directly
  if (decoded?.historyId) {
    try {
      const fetched = await handleGmailNotification(decoded.historyId);
      addWebhookLog({ type: "gmail", event: `historyId:${decoded.historyId}`, status: "success", detail: `fetched ${fetched} messages` });
      return { plugin: "gmail", action: "historyChanged", data: { historyId: decoded.historyId, fetched } };
    } catch (error: any) {
      addWebhookLog({ type: "gmail", event: `historyId:${decoded.historyId}`, status: "error", detail: error?.message });
      throw error;
    }
  }

  addWebhookLog({ type, event, status: "success", detail: "no handler matched" });
  console.log(`[WEBHOOK] No handler matched for ${type}:${event}`);
  return { plugin: null, action: null, data: null };
};

export const verifyWebhook = async (_query: unknown) => {
  return { verified: true };
};
