import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/auth";
import LandingPageClient from "@/components/landing-page-client";

export default async function HomePage() {
  let sessionData = null;
  try {
    sessionData = await auth.api.getSession({ headers: await headers() });
  } catch {
    // Ignore db or auth errors during lookup
  }

  const hasSession = Boolean(sessionData?.session && sessionData?.user);

  if (hasSession) {
    redirect("/dashboard");
  }

  return <LandingPageClient />;
}
