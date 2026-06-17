"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/server/lib/api-client";
import { authClient } from "@/server/better-auth/auth-client";
import { PreviewModal } from "@/components/preview-modal";
import type { CommandPreviewAction } from "@/shared/command";

type GmailMessage = {
  id: string;
  from?: string;
  subject?: string;
  snippet?: string;
  receivedAt?: string;
  priority?: "low" | "normal" | "high";
  labels?: string[];
};

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.replace(/<.*>/, "").trim().split(" ").filter(Boolean);
  const initials = parts.map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return initials || "?";
};

const getAvatarColor = (name?: string) => {
  if (!name) return "bg-zinc-800 text-zinc-400";
  const char = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  const colors = [
    "bg-red-500/10 text-red-400 border-red-500/20",
    "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ];
  return colors[char % colors.length];
};

export default function DashboardPage() {
  const [session, setSession] = useState<{ user: { email: string; name?: string } } | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // AI Command State
  const [aiInput, setAiInput] = useState("");
  const [preview, setPreview] = useState<CommandPreviewAction[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mailRes, calRes] = await Promise.all([
        apiFetch("/api/gmail/messages?limit=10"),
        apiFetch("/api/calendar/events"),
      ]);

      const mailJson = mailRes.ok ? await mailRes.json() : { data: [] };
      const calJson = calRes.ok ? await calRes.json() : { data: [] };

      setMessages(mailJson.data?.messages ?? mailJson.data ?? []);
      setEvents(calJson.data?.events ?? calJson.data ?? []);
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data) setSession(res.data as any);
    });

    (async () => {
      try {
        await apiFetch("/api/sync/setup", { method: "POST" });
      } catch {
        // sync setup may fail on first run; continue
      }
      await loadData();
    })();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiFetch("/api/gmail/refresh", { method: "POST" });
      await apiFetch("/api/sync/setup", { method: "POST" });
      await loadData();
    } catch {
      // sync error
    } finally {
      setSyncing(false);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAiError(null);
    try {
      const res = await apiFetch("/api/command/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: aiInput.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setAiError(json?.error?.message ?? `AI parsing failed: ${res.status}`);
        return;
      }
      const json = await res.json();
      const actions: CommandPreviewAction[] = json.data?.actions ?? [];
      if (actions.length > 0) {
        setPreview(actions);
        setAiInput("");
      } else {
        setAiError("Command understood but no actions generated. Try being more specific.");
      }
    } catch {
      setAiError("Connection to AI engine failed.");
    }
  };

  const handleConfirmExecute = async () => {
    if (!preview || preview.length === 0) return;
    setExecuting(true);
    setAiError(null);
    try {
      const res = await apiFetch("/api/command/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: preview }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setAiError(json?.error?.message ?? `Execution failed: ${res.status}`);
        return;
      }
      setPreview(null);
      await loadData();
    } catch {
      setAiError("Failed to execute command.");
    } finally {
      setExecuting(false);
    }
  };

  const isUnread = (msg: GmailMessage) =>
    !msg.labels?.includes("READ") && !msg.labels?.includes("SEEN");

  // Filter today's events
  const todayStr = new Date().toDateString();
  const todayEvents = events
    .filter((e) => new Date(e.start).toDateString() === todayStr)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const suggestions = [
    { text: "Draft email to boss@example.com about project update", display: "Draft project update email" },
    { text: "Invite team@example.com to sync meeting tomorrow at 10 AM", display: "Schedule team meeting" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto bg-[#020208] p-6 md:p-8 text-zinc-100 font-sans tracking-wide">
      
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <span className="text-[10px] font-bold tracking-widest text-indigo-400/85 uppercase">Noctra Command Center</span>
          <h1 className="font-display bg-gradient-to-r from-white via-zinc-200 to-zinc-450 bg-clip-text text-3xl md:text-4xl font-extrabold tracking-tight text-transparent mt-0.5">
            Welcome back, {session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "User"}
          </h1>
          <p className="mt-1.5 text-xs font-semibold text-zinc-500 tracking-wide">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicators */}
          <div className="hidden items-center gap-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 px-4 py-2.5 text-xs text-zinc-400 backdrop-blur-md md:flex font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)] animate-pulse" />
              Gmail
            </span>
            <span className="h-3 w-px bg-zinc-900" />
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)] animate-pulse" />
              Calendar
            </span>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-950/80 hover:bg-zinc-900 px-5 py-2.5 text-xs font-bold text-zinc-300 transition-all active:scale-95 disabled:opacity-40 shadow-sm cursor-pointer"
          >
            <svg 
              className={`h-3.5 w-3.5 text-zinc-400 ${syncing ? "animate-spin" : ""}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            <span>{syncing ? "Syncing..." : "Sync Workspace"}</span>
          </button>
        </div>
      </motion.div>

      {/* AI Command Center */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border border-zinc-900 bg-gradient-to-b from-zinc-950/70 to-[#06060c]/90 p-6 backdrop-blur-xl shadow-xl shadow-black/10"
      >
        <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-indigo-500/5 blur-[80px]" />
        
        <h2 className="font-display flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300">
          <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Noctra Copilot Command
        </h2>
        
        <form onSubmit={handleAiSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="Tell Noctra what to do... (e.g., 'Draft email to boss about status' or 'Invite Bob to lunch tomorrow at 12pm')"
            className="flex-1 rounded-xl border border-zinc-900 bg-[#020206] px-4 py-3 text-xs md:text-sm text-zinc-100 placeholder-zinc-600 transition-colors focus:border-zinc-850 outline-none focus:ring-1 focus:ring-zinc-850"
          />
          <button
            type="submit"
            disabled={!aiInput.trim()}
            className="rounded-xl bg-indigo-650 hover:bg-indigo-600 px-6 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            Ask AI
          </button>
        </form>

        {aiError && (
          <div className="mt-2 text-xs text-red-400 font-medium">{aiError}</div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-550">
          <span className="font-bold uppercase tracking-wider text-[10px]">Suggestions:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setAiInput(s.text)}
              className="rounded-lg border border-zinc-900 bg-zinc-950/20 px-3 py-1 text-zinc-400 transition-colors hover:border-zinc-800 hover:bg-zinc-900/50 hover:text-zinc-200 cursor-pointer font-medium"
            >
              {s.display}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Split Dashboard Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Today's Events Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-5 rounded-2xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-md p-6 flex flex-col shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3.5">
            <h2 className="font-display flex items-center gap-2.5 text-sm font-semibold text-zinc-200 tracking-wide">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Today's Schedule
            </h2>
            <Link href="/dashboard/calendar" className="text-xs text-indigo-400 hover:text-indigo-350 font-semibold tracking-wide">
              Open Calendar
            </Link>
          </div>

          <div className="mt-5 flex-1 space-y-4">
            {loading ? (
              <div className="flex h-36 items-center justify-center text-xs text-zinc-650">Loading agenda...</div>
            ) : todayEvents.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center gap-2.5 text-center text-xs text-zinc-600">
                <svg className="h-6 w-6 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">No events today. Agenda is clear!</span>
              </div>
            ) : (
              <div className="relative border-l border-zinc-900 pl-4 ml-1 space-y-4">
                {todayEvents.map((evt) => (
                  <motion.div 
                    key={evt.id} 
                    className="relative group"
                    whileHover={{ x: 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {/* Circle timeline dot */}
                    <div className="absolute -left-[21px] top-2 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] group-hover:scale-110 transition-transform" />
                    
                    <div className="rounded-xl border border-zinc-900/60 bg-zinc-950/20 hover:bg-zinc-950/40 p-4 transition-colors">
                      <div className="text-xs font-semibold text-indigo-400 tracking-wider">
                        {formatTime(evt.start)} – {formatTime(evt.end)}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors leading-snug">
                        {evt.title}
                      </div>
                      {evt.description && (
                        <div className="mt-1.5 text-xs text-zinc-450 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Priority Inbox Messages */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-7 rounded-2xl border border-zinc-900 bg-zinc-950/20 backdrop-blur-md p-6 flex flex-col shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3.5">
            <h2 className="font-display flex items-center gap-2.5 text-sm font-semibold text-zinc-200 tracking-wide">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Priority Inbox
            </h2>
            <Link href="/dashboard/gmail" className="text-xs text-indigo-400 hover:text-indigo-350 font-semibold tracking-wide">
              Open Inbox
            </Link>
          </div>

          <div className="mt-3 flex-1 divide-y divide-zinc-950">
            {loading ? (
              <div className="flex h-36 items-center justify-center text-xs text-zinc-650">Loading emails...</div>
            ) : messages.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center gap-2.5 text-center text-xs text-zinc-600">
                <svg className="h-6 w-6 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4.5m16 0h-16" />
                </svg>
                <span className="font-medium">No emails found.</span>
              </div>
            ) : (
              messages.slice(0, 5).map((msg) => {
                const unread = isUnread(msg);
                const colorClass = getAvatarColor(msg.from);
                return (
                  <motion.div 
                    key={msg.id}
                    whileHover={{ scale: 1.008 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Link
                      href={`/dashboard/gmail`}
                      className="flex items-start gap-4 py-4 transition-all hover:bg-zinc-950/60 rounded-xl px-3"
                    >
                      {/* Initials Avatar */}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold uppercase ${colorClass}`}>
                        {getInitials(msg.from)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-xs md:text-sm tracking-wide ${unread ? "font-bold text-zinc-150" : "text-zinc-400"}`}>
                            {msg.from?.replace(/<.*>/, "") ?? "Unknown"}
                          </span>
                          <span className="shrink-0 text-[10px] font-semibold text-zinc-550">{formatDate(msg.receivedAt)}</span>
                        </div>
                        <div className={`mt-0.5 truncate text-xs md:text-sm ${unread ? "font-semibold text-zinc-200" : "text-zinc-400"}`}>
                          {msg.subject ?? "(no subject)"}
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs text-zinc-500 leading-normal">
                          {msg.snippet}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* AI Preview Modal */}
      {preview && (
        <PreviewModal
          actions={preview}
          onActionsChange={setPreview}
          onConfirm={handleConfirmExecute}
          onCancel={() => setPreview(null)}
          loading={executing}
        />
      )}
    </div>
  );
}
