import { processWebhook as corsairProcessWebhook } from "corsair";
import { corsair } from "../corsair";
import { getTenant } from "../corsair/tenant";
import { db } from "../db";
import { account } from "../db/schema";
import { eq } from "drizzle-orm";

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

  const msg = body as { message?: { data?: string }; subscription?: string };
  if (!msg.message || !msg.subscription) return body;

  console.log("[WEBHOOK] Pub/Sub notification detected");

  const encoded = msg.message.data;
  if (typeof encoded !== "string") return body;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    console.log(`[WEBHOOK] Decoded payload: ${decoded}`);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (e) {
    console.error("[WEBHOOK] Failed to decode Pub/Sub data:", e);
    return body;
  }
}

function detectWebhookType(
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | string | undefined | null,
): { type: WebhookLogEntry["type"]; event: string } {
  // Google Calendar push notifications send metadata in HTTP headers
  const googResourceState = (headers["x-goog-resource-state"] || headers["X-Goog-Resource-State"]) as string | undefined;
  const googChannelId = (headers["x-goog-channel-id"] || headers["X-Goog-Channel-ID"]) as string | undefined;
  if (googResourceState || googChannelId) {
    return { type: "calendar", event: `calendar_${googResourceState || "sync"}` };
  }

  if (!body || typeof body !== "object") {
    if (typeof body === "string") return { type: "unknown", event: "raw_string" };
    return { type: "unknown", event: "empty" };
  }

  const b = body;

  if ("historyId" in b || "emailAddress" in b) {
    return { type: "gmail", event: b.historyId ? `historyId:${b.historyId}` : "inbox_change" };
  }

  if ("resourceId" in b || "syncToken" in b) {
    return { type: "calendar", event: (b.resourceId as string) ?? "sync" };
  }

  return { type: "unknown", event: Object.keys(b).slice(0, 3).join(",") || "empty" };
}

async function handleGmailNotification(historyId: string) {
  const googleAccount = await db
    .select()
    .from(account)
    .where(eq(account.providerId, "google"))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const userId = googleAccount?.userId;
  const { withTokenRetry } = await import("../sync/service");

  console.log(`[WEBHOOK] Fetching messages after historyId ${historyId}`);
  try {
    return await withTokenRetry(userId, async (tenant) => {
      const listRes = await tenant.gmail.api.messages.list({ maxResults: 20 });
      const items = (listRes && typeof listRes === "object" && "messages" in listRes) ? (listRes.messages ?? []) : [];
      let fetched = 0;
      for (const item of items) {
        if (item?.id) {
          try {
            const res = await tenant.gmail.api.messages.get({ id: item.id });
            const data = (res && typeof res === "object" && "data" in res && res.data)
              ? res.data
              : res;
            if (data) {
              const upsertData = {
                ...(data as any),
                id: item.id,
              };
              await tenant.gmail.db.messages.upsertByEntityId(item.id, upsertData);
            }
            fetched++;
          } catch { /* skip individual failures */ }
        }
      }
      console.log(`[WEBHOOK] Fetched and cached ${fetched} messages`);
      return fetched;
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[WEBHOOK] Failed to fetch messages:`, message);
    throw error;
  }
}

interface GmailWebhookPayload extends Record<string, unknown> {
  historyId?: string;
  emailAddress?: string;
}

export const processWebhook = async (
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | string | undefined,
  query?: { tenantId?: string; [x: string]: string | string[] | undefined },
) => {
  console.log("[WEBHOOK] Received");

  // Decode Pub/Sub envelope if present
  const safeBody = body ?? {};
  const decodedBody = decodePubSubBody(safeBody);
  const decoded = typeof decodedBody === "object" && decodedBody !== null ? decodedBody as GmailWebhookPayload : null;
  const { type, event } = detectWebhookType(headers, decoded ?? safeBody);

  // Try corsair webhook processing first
  try {
    const result = await corsairProcessWebhook(corsair, headers, decodedBody ?? {}, query);
    if (result.plugin) {
      addWebhookLog({ type, event: `${result.plugin}.${result.action}`, status: "success" });
      console.log(`[WEBHOOK] Handled by ${result.plugin}.${result.action}`);
      return result;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[WEBHOOK] corsairProcessWebhook fallback: ${message}`);
  }

  // Handle Google Calendar push notifications directly
  if (type === "calendar") {
    try {
      const googleAccount = await db
        .select()
        .from(account)
        .where(eq(account.providerId, "google"))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (googleAccount) {
        const { refreshCalendarEvents } = await import("../calendar/service");
        await refreshCalendarEvents(googleAccount.userId);
      }
      addWebhookLog({ type: "calendar", event, status: "success", detail: "synced calendar events" });
      console.log(`[WEBHOOK] Handled Google Calendar push notification (${event})`);
      return { plugin: "googlecalendar", action: "eventsChanged", data: { event } };
    } catch (calErr) {
      const message = calErr instanceof Error ? calErr.message : String(calErr);
      addWebhookLog({ type: "calendar", event, status: "error", detail: message });
      console.error(`[WEBHOOK] Failed to sync calendar events:`, message);
      return { plugin: "googlecalendar", action: "error", data: { error: message } };
    }
  }

  // Fallback: handle Gmail notifications directly
  if (decoded?.historyId) {
    try {
      const fetched = await handleGmailNotification(decoded.historyId);
      addWebhookLog({ type: "gmail", event: `historyId:${decoded.historyId}`, status: "success", detail: `fetched ${fetched} messages` });
      return { plugin: "gmail", action: "historyChanged", data: { historyId: decoded.historyId, fetched } };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      addWebhookLog({ type: "gmail", event: `historyId:${decoded.historyId}`, status: "error", detail: message });
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
