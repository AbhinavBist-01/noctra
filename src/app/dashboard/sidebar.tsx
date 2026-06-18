"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/server/better-auth/auth-client";
import { apiFetch } from "@/server/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  EnvelopeSimple,
  CalendarBlank,
  SignOut,
  CaretLeft,
  CaretRight,
  Bell,
  Palette,
  UserCircle,
  Gear,
  CaretUp,
  Robot,
  PaperPlaneTilt,
  PencilSimpleLine,
  Tray,
} from "@phosphor-icons/react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  id: string;
  badge?: "unread";
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard/agent", label: "AI Agent", icon: <Robot size={18} />, id: "agent" },
      { href: "/dashboard/calendar", label: "Calendar", icon: <CalendarBlank size={18} />, id: "calendar" },
    ],
  },
  {
    title: "Mail",
    items: [
      { href: "/dashboard/gmail", label: "Inbox", icon: <EnvelopeSimple size={18} />, id: "gmail", badge: "unread" },
      { href: "/dashboard/sent", label: "Sent", icon: <PaperPlaneTilt size={18} />, id: "sent" },
      { href: "/dashboard/drafts", label: "Drafts", icon: <PencilSimpleLine size={18} />, id: "drafts" },
    ],
  },
];

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
};

// Custom backlit bat wing emblem
function BatLogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Backlit amber glow */}
      <div className="absolute -inset-1 bg-amber-500/10 blur-sm rounded-full pointer-events-none" />
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-full w-full text-amber-500 fill-current drop-shadow-[0_0_4px_rgba(245,158,11,0.4)] transition-all duration-300"
      >
        <path
          d="M 26 8 
             C 18 9, 12 12, 4 15 
             C 8 18, 9 21, 8 25 
             C 12 24, 16 25, 19 28 
             C 20 24, 23 22, 26 21 
             C 25 26, 25 29, 26 32
             L 32 32
             L 32 8 
             Z"
        />
      </svg>
    </div>
  );
}

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
      // ignore failures
    }
  }, []);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data) setSession(res.data as any);
    });

    fetchSidebarData();
    const interval = setInterval(fetchSidebarData, 15000);
    return () => clearInterval(interval);
  }, [fetchSidebarData]);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userCardRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userCardRef.current && !userCardRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const userInitials = session?.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : session?.user.email?.slice(0, 2).toUpperCase() ?? "?";

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    window.location.href = "/signin";
  }, []);

  const formatEventTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.nav 
      animate={{ width: isCollapsed ? 76 : 240 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="relative flex h-full flex-col border-r border-white/[0.04] bg-[#020206] p-4 gap-6 select-none overflow-visible shrink-0 z-20"
    >
      {/* Brand logo header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 outline-none">
          <BatLogoMark className="h-7 w-7" />
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-base font-extrabold tracking-tight font-display text-transparent bg-clip-text bg-gradient-to-r from-zinc-150 to-zinc-400"
            >
              Noctra
            </motion.span>
          )}
        </Link>

        {/* Sidebar collapse button */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200 transition-colors border border-transparent hover:border-white/[0.04]"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="mx-auto rounded-xl bg-white/[0.02] p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200 transition-all border border-white/[0.04] shadow-sm hover:scale-[1.03]"
        >
          <CaretRight size={14} weight="bold" />
        </button>
      )}

      {/* Main Navigation Links — grouped by section */}
      <div className="flex flex-col gap-5">
        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            {/* Section label */}
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 pb-1 text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600"
              >
                {section.title}
              </motion.span>
            )}

            {section.items.map((item) => {
              const active = pathname.startsWith(item.href);
              const hasCount = item.badge === "unread" && unreadCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center justify-between rounded-xl py-3 transition-colors duration-250 ${
                    active
                      ? "text-amber-500 font-bold"
                      : "text-zinc-450 hover:text-zinc-200"
                  } ${isCollapsed ? "px-0 justify-center" : "px-4"}`}
                >
                  {/* Sliding active pill indicator */}
                  {active && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      className="absolute inset-0 bg-white/[0.02] border border-white/[0.04] rounded-xl -z-10 shadow-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}

                  <div className="flex items-center gap-3">
                    <span className={active ? "text-amber-500" : "text-zinc-500"}>{item.icon}</span>
                    {!isCollapsed && (
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && hasCount && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                        active
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-white/[0.02] text-zinc-550 border border-white/[0.04]"
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Today's Agenda Mini Widget */}
      {!isCollapsed && (
        <div className="flex flex-col gap-4 px-2 border-t border-white/[0.04] pt-6">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">Today&apos;s Agenda</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-550 hover:text-zinc-300 select-none">
              <input 
                type="checkbox" 
                checked={showEventsOption}
                onChange={(e) => setShowEventsOption(e.target.checked)}
                className="accent-amber-500 h-3 w-3 rounded border-white/[0.06] bg-zinc-950" 
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
                  <span className="text-[10px] text-zinc-600 font-mono">No events scheduled</span>
                ) : (
                  todayAgenda.map((evt) => (
                    <motion.div 
                      key={evt.id} 
                      className="flex flex-col gap-0.5 border-l-2 border-amber-500/20 pl-2.5"
                      whileHover={{ x: 2 }}
                    >
                      <span className="truncate text-xs font-semibold text-zinc-300 tracking-wide">{evt.title}</span>
                      <span className="text-[10px] text-zinc-550 font-mono">{formatEventTime(evt.start)}</span>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Bottom User Card ── */}
      <div className="mt-auto border-t border-white/[0.04] pt-3" ref={userCardRef}>
        {session ? (
          <div className="relative">
            {/* Settings Popover */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="absolute bottom-full left-0 right-0 mb-2 z-50"
                >
                  <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/98 shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden">
                    {/* User identity header */}
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04]">
                      <div className="relative shrink-0">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                          <span className="text-xs font-extrabold font-mono text-amber-500 tracking-wider">
                            {userInitials}
                          </span>
                        </div>
                        {/* Online indicator */}
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow-sm shadow-emerald-500/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {session.user.name && (
                          <div className="truncate text-[11px] font-bold font-mono text-zinc-200 tracking-wide">
                            {session.user.name}
                          </div>
                        )}
                        <div className="truncate text-[10px] font-mono text-zinc-500" title={session.user.email}>
                          {session.user.email}
                        </div>
                      </div>
                    </div>

                    {/* Settings links */}
                    <div className="flex flex-col py-1.5 px-1.5 gap-0.5">
                      {[
                        { icon: <UserCircle size={14} />, label: "Profile", href: "/dashboard/profile" },
                        { icon: <Bell size={14} />, label: "Notifications", href: "/dashboard/notifications" },
                        { icon: <Palette size={14} />, label: "Appearance", href: "/dashboard/appearance" },
                        { icon: <Gear size={14} />, label: "Settings", href: "/dashboard/settings" },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] font-mono font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-all group"
                        >
                          <span className="text-zinc-500 group-hover:text-amber-500 transition-colors">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-white/[0.04] px-1.5 py-1.5">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] font-mono font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all group cursor-pointer"
                      >
                        <SignOut size={14} className="group-hover:text-red-400 transition-colors" />
                        Sign out
                      </button>
                    </div>
                  </div>
                  {/* Arrow pointer */}
                  <div className="absolute -bottom-1.5 left-5 h-3 w-3 rotate-45 rounded-sm border-b border-r border-white/[0.06] bg-zinc-950/98" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* User card trigger */}
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer border ${
                userMenuOpen
                  ? "bg-white/[0.05] border-white/[0.08] text-zinc-200"
                  : "bg-white/[0.02] border-white/[0.04] text-zinc-400 hover:bg-white/[0.04] hover:border-white/[0.06] hover:text-zinc-200"
              } ${isCollapsed ? "justify-center px-0" : ""}`}
              title={isCollapsed ? session.user.email : undefined}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={`${isCollapsed ? "h-7 w-7" : "h-7 w-7"} rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center`}>
                  <span className="text-[9px] font-extrabold font-mono text-amber-500">
                    {userInitials}
                  </span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-[1.5px] border-zinc-950" />
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate text-[10px] font-bold font-mono text-zinc-300 tracking-wide leading-tight">
                      {session.user.name ?? session.user.email?.split("@")[0]}
                    </div>
                    <div className="truncate text-[9px] font-mono text-zinc-600 leading-tight">
                      {session.user.email}
                    </div>
                  </div>
                  <CaretUp
                    size={11}
                    weight="bold"
                    className={`shrink-0 text-zinc-600 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </>
              )}
            </button>
          </div>
        ) : (
          <Link
            href="/signin"
            className={`block rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-center text-xs font-mono font-bold text-zinc-950 transition-colors ${
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
