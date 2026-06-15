import "dotenv/config";
import { corsair } from "../corsair";

async function main() {
  const tenant = corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");
  try {
    const result = await tenant.gmail.api.messages.list({ maxResults: 1 } as any);
    console.log("SUCCESS:", JSON.stringify(result, null, 2).slice(0, 500));
  } catch (err: any) {
    console.error("CORSAIR ERROR:", err.message);
    console.error("Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
  }
}

main().catch((e) => console.error(e));
