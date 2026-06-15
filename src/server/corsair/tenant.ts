import { corsair } from "../corsair";

let cachedTenant: ReturnType<typeof corsair.withTenant> | null = null;

export const getTenant = () => {
  if (!cachedTenant) {
    cachedTenant = corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");
  }
  return cachedTenant;
};
