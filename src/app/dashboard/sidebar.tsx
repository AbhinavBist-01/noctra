"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/server/better-auth/auth-client";
import { apiFetch } from "@/server/lib/api-client";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  id: "gmail" | "calendar";
};

const navItems: NavItem[] = [
  { href: "/dashboard/gmail", label: "Inbox", icon: "📬", id: "gmail" },
  { href: "/dashboard/calendar", label: "Calendar", icon: "📅", id: "calendar" },
];

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const [session, setSession] = useState<{ user: { email: string; name?: string } } | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [todayAgenda, setTodayAgenda] = useState<CalendarEvent[]>([]);

  const fetchSidebarData = useCallback(async () => {
    try {
      // Fetch unread count
      const mailRes = await apiFetch("/api/gmail/messages?limit=50");
      if (mailRes.ok) {
        const mailJson = await mailRes.json();
        const msgs = mailJson.data?.messages ?? mailJson.data ?? [];
        const unreads = msgs.filter((m: any) => !m.labels?.includes("READ") && !m.labels?.includes("SEEN")).length;
        setUnreadCount(unreads);
      }

      // Fetch today's agenda
      const calRes = await apiFetch("/api/calendar/events");
      if (calRes.ok) {
        const calJson = await calRes.json();
        const eventsList = calJson.data?.events ?? calJson.data ?? [];
        const todayStr = new Date().toDateString();
        const filtered = eventsList
          .filter((e: any) => new Date(e.start).toDateString() === todayStr)
          .slice(0, 3);
        setTodayAgenda(filtered);
      }
    } catch {
      // ignore failures on loading state
    }
  }, []);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data) setSession(res.data as any);
    });

    fetchSidebarData();
    // Poll every 15 seconds to update unread count / agenda
    const interval = setInterval(fetchSidebarData, 15000);
    return () => clearInterval(interval);
  }, [fetchSidebarData]);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    window.location.href = "/signin";
  }, []);

  const formatEventTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950 p-4 gap-6 select-none">
      
      {/* Brand logo header */}
      <div className="flex items-center gap-3 px-3 pt-2">
        <Link href="/dashboard" className="text-xl font-extrabold tracking-tight text-white hover:opacity-95 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-450 text-sm font-bold shadow-md shadow-indigo-600/10">
            N
          </div>
          <span>Noctra</span>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const hasCount = item.id === "gmail" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-zinc-900 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-350"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {hasCount && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-indigo-650 text-white" : "bg-zinc-900 text-zinc-550"
                }`}>
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Today's Agenda Mini Widget */}
      <div className="flex flex-col gap-3 px-3 border-t border-zinc-900 pt-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Today's Agenda</span>
        
        {todayAgenda.length === 0 ? (
          <span className="text-xs text-zinc-600 font-medium">No events scheduled</span>
        ) : (
          <div className="space-y-3">
            {todayAgenda.map((evt) => (
              <div key={evt.id} className="flex flex-col gap-0.5">
                <span className="truncate text-xs font-semibold text-zinc-300">{evt.title}</span>
                <span className="text-[10px] text-zinc-550 font-medium">{formatEventTime(evt.start)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Profile and Logout Section */}
      <div className="mt-auto border-t border-zinc-900 pt-4 flex flex-col gap-3">
        {session ? (
          <div className="flex flex-col gap-2 px-3">
            <div className="truncate text-xs text-zinc-550 font-medium" title={session.user.email}>
              {session.user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-850/50 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/signin"
            className="block w-full rounded-xl bg-zinc-900 hover:bg-zinc-850 py-2.5 text-center text-xs font-semibold text-zinc-300 transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
