import { processWebhook as corsairProcessWebhook } from "corsair";
import { corsair } from "../corsair";

export const processWebhook = async (
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown> | string,
  query?: { tenantId?: string; [x: string]: string | string[] | undefined },
) => {
  console.log("[WEBHOOK] Received");
  const result = await corsairProcessWebhook(corsair, headers, body, query);
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
