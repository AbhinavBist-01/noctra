import { processWebhook as corsairProcessWebhook } from "corsair";
import { corsair } from "../corsair";

// Pub/Sub push subscription wraps the payload in a "message" envelope
function decodePubSubBody(
  body: Record<string, unknown> | string,
): Record<string, unknown> | string {
  if (typeof body !== "object" || !body) return body;

  const msg = body as Record<string, any>;
  if (!msg.message || !msg.subscription) return body;

  // This is a Pub/Sub push notification
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

export const processWebhook = async (
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | string,
  query?: { tenantId?: string; [x: string]: string | string[] | undefined },
) => {
  console.log("[WEBHOOK] Received");

  // Decode Pub/Sub envelope if present
  const decodedBody = decodePubSubBody(body);

  const result = await corsairProcessWebhook(
    corsair,
    headers,
    decodedBody,
    query,
  );

  if (result.plugin) {
    console.log(`[WEBHOOK] Handled by ${result.plugin}.${result.action}`);
  } else {
    console.log(`[WEBHOOK] No plugin matched`);
  }
  return result;
};

export const verifyWebhook = async (_query: unknown) => {
  return { verified: true };
};
