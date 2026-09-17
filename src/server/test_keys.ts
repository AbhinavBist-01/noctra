import "dotenv/config";
import { corsair } from "./corsair";

async function main() {
  const tenant = corsair.withTenant("aRMh6GIK6ylwOdJcYkO10dH3D2PAvgqc");
  const token = await tenant.gmail.keys.get_access_token();
  console.log("Corsair Gmail access token:", token ? token.slice(0, 15) + "..." : null);
  const exp = await tenant.gmail.keys.get_expires_at();
  console.log("Corsair Gmail expires at:", exp);
  const ref = await tenant.gmail.keys.get_refresh_token();
  console.log("Corsair Gmail has refresh token:", !!ref);
  
  const calToken = await tenant.googlecalendar.keys.get_access_token();
  console.log("Corsair Calendar access token:", calToken ? calToken.slice(0, 15) + "..." : null);
  const calExp = await tenant.googlecalendar.keys.get_expires_at();
  console.log("Corsair Calendar expires at:", calExp);
  const calRef = await tenant.googlecalendar.keys.get_refresh_token();
  console.log("Corsair Calendar has refresh token:", !!calRef);

  // Test live API call
  try {
    const res = await tenant.gmail.api.messages.list({ maxResults: 1 });
    console.log("Gmail API call successful! Messages count:", (res as any)?.messages?.length);
  } catch (e) {
    console.error("Gmail API call error:", e);
  }

  try {
    const calRes = await tenant.googlecalendar.api.events.getMany({ maxResults: 1 });
    console.log("Calendar API call successful! Items count:", (calRes as any)?.items?.length ?? (Array.isArray(calRes) ? calRes.length : "ok"));
  } catch (e) {
    console.error("Calendar API call error:", e);
  }

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
