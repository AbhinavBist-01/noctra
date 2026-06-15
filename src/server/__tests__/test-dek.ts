import "dotenv/config";
import { corsair } from "../corsair";

async function main() {
  const tenant = corsair.withTenant("dev");

  // Check tenant keys vs context keys
  const gmail = tenant.gmail as any;
  console.log("tenant.gmail.keys type:", typeof gmail.keys);
  console.log("tenant.gmail.keys.get_access_token:", typeof gmail.keys?.get_access_token);
  
  // Try getting the token
  const tok = await gmail.keys.get_access_token();
  console.log("access_token present:", !!tok);
  console.log("access_token[:30]:", tok?.slice(0, 30));

  // Now try the API method and catch where the error comes from
  try {
    const res = await gmail.api.messages.list({ maxResults: 1 } as any);
    console.log("API succeeded");
  } catch (err: any) {
    console.log("API error message:", err.message);
    console.log("API error constructor:", err.constructor.name);
    console.log("API error stack:", err.stack?.split("\n").slice(0, 3).join("\n"));
  }

  process.exit(0);
}

main();
