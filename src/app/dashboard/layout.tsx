import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="flex h-full flex-col">
      {children}
    </div>
  );
}
