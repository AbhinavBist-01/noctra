"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/server/better-auth/auth-client";
import { apiFetch } from "@/server/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";

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
  
  // Collapse sidebar & toggle agenda options
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showEventsOption, setShowEventsOption] = useState(true);

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
          .slice(0, 4);
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
    <motion.nav 
      animate={{ width: isCollapsed ? 68 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="relative flex h-full flex-col border-r border-zinc-900 bg-zinc-950 p-4 gap-6 select-none overflow-hidden shrink-0"
    >
      {/* Brand logo header with generated Noctra logo image */}
      <div className="flex items-center justify-between px-2 pt-2">
        <Link href="/dashboard" className="flex items-center gap-3">
          <motion.img 
            src="/noctra_logo.png" 
            alt="Noctra Logo" 
            className="h-8 w-8 rounded-xl object-cover border border-zinc-800"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          />
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent"
            >
              Noctra
            </motion.span>
          )}
        </Link>

        {/* Sidebar collapse button */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded-lg p-1 text-zinc-550 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="mx-auto rounded-lg bg-zinc-900/60 p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 transition-colors border border-zinc-850"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Navigation Links */}
      <div className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const hasCount = item.id === "gmail" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-xl py-2.5 transition-all ${
                active
                  ? "bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-850/60"
                  : "text-zinc-500 hover:bg-zinc-900/30 hover:text-zinc-350"
              } ${isCollapsed ? "px-0 justify-center" : "px-4"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                {!isCollapsed && <span className="text-sm font-semibold tracking-wide">{item.label}</span>}
              </div>
              
              {!isCollapsed && hasCount && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? "bg-indigo-650 text-white shadow-[0_0_8px_rgba(79,70,229,0.3)]" : "bg-zinc-900 text-zinc-550"
                }`}>
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Today's Agenda Mini Widget & Options Toggle */}
      {!isCollapsed && (
        <div className="flex flex-col gap-4 px-2 border-t border-zinc-900 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Today's Agenda</span>
            {/* Show/Hide Events Toggle Option */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-350 select-none">
              <input 
                type="checkbox" 
                checked={showEventsOption}
                onChange={(e) => setShowEventsOption(e.target.checked)}
                className="accent-indigo-500 h-3 w-3 rounded border-zinc-800 bg-zinc-900" 
              />
              <span>Show</span>
            </label>
          </div>
          
          <AnimatePresence>
            {showEventsOption && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3.5 overflow-hidden"
              >
                {todayAgenda.length === 0 ? (
                  <span className="text-xs text-zinc-600 font-medium">No events scheduled</span>
                ) : (
                  todayAgenda.map((evt) => (
                    <motion.div 
                      key={evt.id} 
                      className="flex flex-col gap-0.5"
                      whileHover={{ x: 2 }}
                    >
                      <span className="truncate text-xs font-semibold text-zinc-300 tracking-wide">{evt.title}</span>
                      <span className="text-[10px] text-zinc-550 font-medium">{formatEventTime(evt.start)}</span>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Profile and Logout Section */}
      <div className="mt-auto border-t border-zinc-900 pt-4 flex flex-col gap-3">
        {session ? (
          <div className={`flex flex-col gap-2 ${isCollapsed ? "px-0 items-center" : "px-2"}`}>
            {!isCollapsed ? (
              <>
                <div className="truncate text-xs text-zinc-550 font-medium" title={session.user.email}>
                  {session.user.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-850/60 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={handleSignOut}
                className="rounded-xl bg-zinc-900 hover:bg-zinc-850 p-2 text-zinc-400 hover:text-zinc-200 border border-zinc-850 transition-colors"
                title="Sign out"
              >
                📥
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/signin"
            className={`block rounded-xl bg-zinc-900 hover:bg-zinc-850 py-2.5 text-center text-xs font-semibold text-zinc-300 transition-colors ${
              isCollapsed ? "px-0" : "px-4"
            }`}
          >
            {isCollapsed ? "🔑" : "Sign in"}
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
