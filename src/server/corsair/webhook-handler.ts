import { processWebhook } from "corsair";
import { corsair } from "../corsair";

export async function handleWebhook(req: Request) {
  const url = new URL(req.url);

  const result = await processWebhook(
    corsair, // corsair instance
    Object.fromEntries(req.headers), // headers
    await req.json(), // body
    {
      tenantId: url.searchParams.get("tenantId") as string, // tenant id
    },
  );

  if (result.plugin) {
    console.log(`Handled by ${result.plugin}.${result.action}`);
  }

  return result.response;
}
