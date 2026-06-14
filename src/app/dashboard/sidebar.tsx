"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/server/better-auth/auth-client";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard/gmail", label: "Inbox", icon: "📬" },
  { href: "/dashboard/calendar", label: "Calendar", icon: "📅" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [session, setSession] = useState<{ user: { email: string; name?: string } } | null>(null);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data) setSession(res.data as any);
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    window.location.href = "/signin";
  }, []);

  return (
    <nav className="flex w-56 flex-col gap-1 border-r border-zinc-800 bg-zinc-900/50 p-3">
      <Link href="/dashboard/gmail" className="mb-4 px-3 pt-2 text-lg font-semibold tracking-tight text-zinc-400 hover:text-zinc-200">
        Noctra
      </Link>

      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="mt-auto border-t border-zinc-800 pt-3">
        {session ? (
          <div className="space-y-2 px-3">
            <div className="truncate text-xs text-zinc-500">
              {session.user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/signin"
            className="block w-full rounded-lg bg-zinc-800 px-3 py-2 text-center text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
