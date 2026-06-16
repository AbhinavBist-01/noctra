import { db } from "../db";
import { account, corsairIntegrations, corsairAccounts } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { corsair } from "../corsair";
import { AppError } from "../lib/app-error";
import { randomUUID } from "node:crypto";

export type SyncResult = {
  gmail: boolean;
  calendar: boolean;
};

const PLUGINS = ["gmail", "googlecalendar"] as const;

async function ensurePluginKeys(
  tenant: ReturnType<typeof corsair.withTenant>,
  pluginName: string,
  accessToken: string,
  refreshToken: string | null,
  scope: string | null,
  expiresAt: string | null | undefined,
) {
  const plugin = (tenant as any)[pluginName];
  const keys = plugin.keys;

  // Issue DEK if not present
  try {
    await keys.get_access_token();
  } catch {
    await keys.issue_new_dek();
  }

  // Set OAuth tokens via encrypted setters
  await keys.set_access_token(accessToken);
  if (refreshToken) await keys.set_refresh_token(refreshToken);
  if (scope) await keys.set_scope(scope);
  if (expiresAt) await keys.set_expires_at(expiresAt);
}

async function ensureIntegrationAndKeys(
  userId: string,
  tenant: ReturnType<typeof corsair.withTenant>,
) {
  const userAccount = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!userAccount) {
    throw new AppError(
      "VALIDATION_ERROR",
      "No Google account linked. Sign in with Google first.",
    );
  }

  if (!userAccount.accessToken) {
    throw new AppError("VALIDATION_ERROR", "Google access token not found.");
  }

  const tenantId = process.env.CORSAIR_TENANT_ID ?? "dev";

  for (const name of PLUGINS) {
    // Ensure integration record exists
    const integration = await db
      .select()
      .from(corsairIntegrations)
      .where(eq(corsairIntegrations.name, name))
      .limit(1)
      .then((r) => r[0] ?? null);

    let integrationId: string;
    if (!integration) {
      integrationId = randomUUID();
      await db.insert(corsairIntegrations).values({
        id: integrationId,
        name,
        config: {
          clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
          clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
        },
      });
    } else {
      integrationId = integration.id;
    }

    // Ensure corsair account exists
    const existingAccount = await db
      .select()
      .from(corsairAccounts)
      .where(
        and(
          eq(corsairAccounts.tenantId, tenantId),
          eq(corsairAccounts.integrationId, integrationId),
        ),
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!existingAccount) {
      await db.insert(corsairAccounts).values({
        id: randomUUID(),
        tenantId,
        integrationId,
        config: {},
      });
    }

    // Issue DEK + set tokens via keys manager
    await ensurePluginKeys(
      tenant,
      name,
      userAccount.accessToken,
      userAccount.refreshToken,
      userAccount.scope,
      userAccount.accessTokenExpiresAt?.toISOString(),
    );
  }
}

export async function setupUserSync(userId: string): Promise<SyncResult> {
  const tenant = corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");

  await ensureIntegrationAndKeys(userId, tenant);

  let gmail = false;
  let calendar = false;

  try {
    await tenant.gmail.api.messages.list({ maxResults: 1 } as any);
    gmail = true;
  } catch (err) {
    console.error("Gmail sync test failed:", (err as Error).message);
  }

  try {
    await tenant.googlecalendar.api.events.getMany({} as any);
    calendar = true;
  } catch (err) {
    console.error("Calendar sync test failed:", (err as Error).message);
  }

  return { gmail, calendar };
}
