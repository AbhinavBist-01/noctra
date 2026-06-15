import "dotenv/config";
import { corsair } from "../corsair";

const tenant = corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");

// Test Calendar API too
try {
  const cal = await tenant.googlecalendar.api.events.getMany({} as any);
  console.log("Calendar SUCCESS:", JSON.stringify(cal).slice(0, 200));
} catch (err: any) {
  console.error("Calendar ERROR:", err.message, err.status);
}

process.exit(0);
