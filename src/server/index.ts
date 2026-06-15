import "dotenv/config";
import { app } from "./app";
import { getTenant } from "./corsair/tenant";

const PORT = process.env.EXPRESS_PORT ?? 4000;

const tenant = getTenant();

app.listen(PORT, async () => {
  try {
    await tenant.gmail.api.messages.list({ maxResults: 1 } as any);
    console.log("[corsair] Gmail integration ready");
  } catch (e: any) {
    console.log(`[corsair] Gmail integration not ready: ${e.message}`);
  }
  console.log(`[Express] Server running on http://localhost:${PORT}`);
});
