import "dotenv/config";
import { corsair } from "../corsair";

async function main() {
  const tenant = corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");
  
  // Test DB list (what getGmailMessages uses)
  try {
    const result = await tenant.gmail.db.messages.list({ limit: 5, offset: 0 } as any);
    console.log("DB list SUCCESS. Count:", Array.isArray(result) ? result.length : typeof result);
    if (Array.isArray(result) && result.length > 0) {
      console.log("First item keys:", Object.keys(result[0] as object));
    }
  } catch (err: any) {
    console.error("DB list ERROR:", err.message);
    console.error("Stack:", err.stack?.split("\n").slice(0, 3).join("\n"));
  }
  
  process.exit(0);
}

main();
