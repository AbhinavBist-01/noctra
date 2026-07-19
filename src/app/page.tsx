import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/auth";
import LandingPageClient from "@/components/landing-page-client";

export default async function HomePage() {
  let session = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    // Session check failed, render landing page
  }

  if (session) {
    redirect("/dashboard");
  }

  return <LandingPageClient />;
}
