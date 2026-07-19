import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/auth";
import { DashboardSidebar } from "./sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    redirect("/signin");
  }

  if (!session) {
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
