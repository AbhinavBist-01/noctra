import { corsair } from "./corsair";

export const getTenant = () => {
  return corsair.withTenant(process.env.CORSAIR_TENANT_ID ?? "dev");
};
