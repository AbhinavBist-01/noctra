import { corsair } from "../corsair";

/**
 * Cache of tenant clients keyed by tenantId (userId).
 * Tenant clients are cheap to create and the SDK caches keys internally,
 * so we keep a map here purely to avoid re-creating the wrapper on every call.
 */
const tenantCache = new Map<string, ReturnType<typeof corsair.withTenant>>();

/**
 * Returns a Corsair tenant client for the given userId.
 * Falls back to CORSAIR_TENANT_ID env var if no userId provided (legacy/boot path).
 *
 * IMPORTANT: DEKs must be initialized first via setupUserSync(userId) before
 * making any API calls through this client. Call setupUserSync on sign-in.
 */
export const getTenant = (userId?: string) => {
  const tenantId = userId ?? process.env.CORSAIR_TENANT_ID ?? "dev";
  const cached = tenantCache.get(tenantId);
  if (cached) return cached;
  const client = corsair.withTenant(tenantId);
  tenantCache.set(tenantId, client);
  return client;
};

/**
 * Clears the tenant cache — useful after re-provisioning keys.
 */
export const clearTenantCache = () => tenantCache.clear();
