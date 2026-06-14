import { randomUUID } from "node:crypto";
import { db } from "../db";
import { account, corsairAccounts, corsairIntegrations } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { corsair } from "../corsair";
import { AppError } from "../lib/app-error";

export type SyncResult = {
  integrationId: string;
  accountId: string;
  gmail: boolean;
  calendar: boolean;
};

export async function setupUserSync(userId: string): Promise<SyncResult> {
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

  const tokenConfig = {
    access_token: userAccount.accessToken,
    refresh_token: userAccount.refreshToken,
    scope: userAccount.scope,
    expires_at: userAccount.accessTokenExpiresAt?.toISOString(),
  };

  const integrations = await db
    .select()
    .from(corsairIntegrations)
    .where(eq(corsairIntegrations.name, "google"))
    .limit(1);

  let integrationId: string;
  if (integrations.length === 0) {
    const id = crypto.randomUUID();
    await db.insert(corsairIntegrations).values({
      id,
      name: "google",
      config: {
        clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      },
    });
    integrationId = id;
  } else {
    if (!integrations[0]?.id) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Integration ID is missing for Google integration.",
      );
    }
    integrationId = integrations[0]?.id as string;
  }

  const existingAccount = await db
    .select()
    .from(corsairAccounts)
    .where(
      and(
        eq(corsairAccounts.tenantId, process.env.CORSAIR_TENANT_ID ?? "dev"),
        eq(corsairAccounts.integrationId, integrationId),
      ),
    )
    .limit(1);

  let accountId: string;
  if (existingAccount.length > 0) {
    if (!existingAccount[0]?.id) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Account ID is missing for existing Corsair account.",
      );
    }
    accountId = existingAccount[0].id as string;
    await db
      .update(corsairAccounts)
      .set({ config: tokenConfig, updatedAt: new Date() })
      .where(eq(corsairAccounts.id, accountId));
  } else {
    accountId = crypto.randomUUID();
    await db.insert(corsairAccounts).values({
      id: accountId,
      tenantId: process.env.CORSAIR_TENANT_ID ?? "dev",
      integrationId,
      config: tokenConfig,
    });
  }

  let gmail = false;
  let calendar = false;

  try {
    const tenant = corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");
    await tenant.gmail.api.messages.list({ maxResults: 1 } as any);
    gmail = true;
  } catch (err) {
    console.error("Gmail sync test failed:", (err as Error).message);
  }

  try {
    const tenant = corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");
    await tenant.googlecalendar.api.events.getMany({} as any);
    calendar = true;
  } catch (err) {
    console.error("Calendar sync test failed:", (err as Error).message);
  }

  return { integrationId, accountId, gmail, calendar };
}
