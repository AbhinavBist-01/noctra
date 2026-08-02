import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/auth";
import { DashboardSidebar } from "./sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let sessionData = null;
  try {
    sessionData = await auth.api.getSession({ headers: await headers() });
  } catch (err) {
    console.log("[DashboardLayout] getSession threw error:", err);
  }

  console.log("[DashboardLayout] sessionData:", JSON.stringify(sessionData));
  const hasSession = Boolean(sessionData?.session && sessionData?.user);
  console.log("[DashboardLayout] hasSession:", hasSession);

  if (!hasSession) {
    console.log("[DashboardLayout] Redirecting to /signin...");
    redirect("/signin");
  }

  return (
    <div className="flex h-full">
      <DashboardSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
