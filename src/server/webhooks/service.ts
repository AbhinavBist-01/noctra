import { db } from "../db";
import { corsairEvents } from "../db/schema";

export const processWebhook = async (payload: unknown) => {
  console.log("[WEBHOOK] Received:", JSON.stringify(payload).slice(0, 500));

  const source = (payload as any)?.source ?? (payload as any)?.type ?? "unknown";
  const eventType = `webhook.${source}`;

  try {
    await db.insert(corsairEvents).values({
      id: crypto.randomUUID(),
      accountId: "webhook",
      eventType,
      payload: payload as Record<string, unknown>,
      status: "received",
    });

    return { received: true, source };
  } catch (error) {
    console.error("[WEBHOOK] Storage failed:", error);
    return { received: true, stored: false, source };
  }
};

export const verifyWebhook = async (_query: unknown) => {
  return { verified: true };
};
