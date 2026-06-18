"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/server/lib/api-client";
import { authClient } from "@/server/better-auth/auth-client";
import { PreviewModal } from "@/components/preview-modal";
import type { CommandPreviewAction } from "@/shared/command";
import {
  Sparkle,
  ArrowClockwise,
  ArrowRight,
  Clock,
  User,
  CalendarBlank,
  EnvelopeSimple,
  ArrowsLeftRight,
  Lightning,
  Terminal,
  PaperPlaneTilt,
  CaretRight,
  Check
} from "@phosphor-icons/react";

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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring" as const, stiffness: 220, damping: 20 } 
  }
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
    { text: "Draft email to boss@example.com about project update", display: "Draft status report" },
    { text: "Invite team@example.com to sync meeting tomorrow at 10 AM", display: "Schedule team sync" },
  ];

  return (
    <div className="relative flex flex-1 flex-col gap-8 overflow-y-auto bg-[#020206] p-6 md:p-8 text-zinc-100 font-sans tracking-wide">
      
      {/* Background radial grid overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, #f59e0b 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col gap-8 w-full"
      >
        {/* Header Banner */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase">Noctra Command Center</span>
            <h1 className="font-display bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-3xl md:text-4xl font-extrabold tracking-tight text-transparent mt-1">
              Welcome back, {session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "User"}
            </h1>
            <p suppressHydrationWarning className="mt-1.5 text-xs font-mono text-zinc-550 font-semibold tracking-wide">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicators */}
            <div className="hidden items-center gap-4 rounded-xl border border-white/[0.04] bg-zinc-950/40 px-4 py-2.5 text-xs text-zinc-400 backdrop-blur-md md:flex font-mono font-bold">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Gmail API</span>
              </span>
              <span className="h-3 w-px bg-white/[0.06]" />
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Calendar API</span>
              </span>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing || loading}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-5 py-2.5 text-xs font-mono font-bold text-zinc-300 transition-all active:scale-95 disabled:opacity-40 shadow-sm cursor-pointer hover:border-white/[0.12]"
            >
              <ArrowClockwise className={`h-3.5 w-3.5 text-zinc-450 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing..." : "Sync Workspace"}</span>
            </button>
          </div>
        </motion.div>

        {/* AI Command Center */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl border border-white/[0.04] bg-zinc-950/40 p-6 backdrop-blur-xl shadow-xl shadow-black/40"
        >
          {/* Subtle amber gradient spotlight background */}
          <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-amber-500/5 blur-[80px]" />
          
          <h2 className="font-display flex items-center gap-2.5 text-sm font-semibold tracking-wide text-zinc-300">
            <Sparkle size={16} weight="fill" className="text-amber-500 animate-pulse" />
            <span>Noctra Copilot Command</span>
          </h2>
          
          <form onSubmit={handleAiSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Tell Noctra what to do... (e.g., 'Draft email to boss about status' or 'Invite Bob to lunch tomorrow at 12pm')"
              className="flex-1 rounded-xl border border-white/[0.05] bg-[#020206]/85 px-4.5 py-3 text-xs md:text-sm text-zinc-100 placeholder-zinc-700 font-mono transition-colors focus:border-amber-500/40 outline-none"
            />
            <button
              type="submit"
              disabled={!aiInput.trim()}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-6 text-xs font-mono font-bold text-zinc-950 transition-all active:scale-95 disabled:opacity-45 disabled:pointer-events-none shadow-md shadow-amber-500/10 cursor-pointer"
            >
              Ask AI
            </button>
          </form>

          {aiError && (
            <div className="mt-2.5 text-xs text-red-400 font-mono font-medium">{aiError}</div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs text-zinc-550">
            <span className="font-bold uppercase tracking-wider text-[9px] font-mono">Suggestions:</span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setAiInput(s.text)}
                className="rounded-lg border border-white/[0.04] bg-white/[0.01] px-3.5 py-1.5 text-zinc-400 transition-colors hover:border-amber-500/20 hover:bg-white/[0.03] hover:text-amber-500 cursor-pointer font-mono text-[10px]"
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
            variants={itemVariants}
            className="lg:col-span-5 rounded-2xl border border-white/[0.04] bg-zinc-950/20 backdrop-blur-md p-6 flex flex-col shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <h2 className="font-display flex items-center gap-2.5 text-sm font-semibold text-zinc-200 tracking-wide">
                <CalendarBlank size={16} className="text-amber-500" />
                <span>Today&apos;s Schedule</span>
              </h2>
              <Link href="/dashboard/calendar" className="text-xs font-mono font-bold text-amber-500 hover:text-amber-400 tracking-wider">
                Open Calendar
              </Link>
            </div>

            <div className="mt-5 flex-1 space-y-4">
              {loading ? (
                <div className="flex h-36 items-center justify-center text-xs font-mono text-zinc-650">Loading agenda...</div>
              ) : todayEvents.length === 0 ? (
                <div className="flex h-36 flex-col items-center justify-center gap-3 text-center text-xs text-zinc-600 font-mono">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/[0.01] border border-white/[0.03] text-zinc-700">
                    <Check size={18} />
                  </div>
                  <span className="font-medium text-zinc-550">No events scheduled. Agenda is clear!</span>
                </div>
              ) : (
                <div className="relative border-l border-white/[0.04] pl-4 ml-1 space-y-4">
                  {todayEvents.map((evt) => (
                    <motion.div 
                      key={evt.id} 
                      className="relative group"
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      {/* Circle timeline dot */}
                      <div className="absolute -left-[21px] top-2 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform" />
                      
                      <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-amber-500/10 p-4 transition-all duration-200">
                        <div className="text-[10px] font-mono font-bold text-amber-500">
                          {formatTime(evt.start)} – {formatTime(evt.end)}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors leading-snug">
                          {evt.title}
                        </div>
                        {evt.description && (
                          <div className="mt-2 text-xs text-zinc-500 line-clamp-2 leading-relaxed font-mono">
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
            variants={itemVariants}
            className="lg:col-span-7 rounded-2xl border border-white/[0.04] bg-zinc-950/20 backdrop-blur-md p-6 flex flex-col shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
              <h2 className="font-display flex items-center gap-2.5 text-sm font-semibold text-zinc-200 tracking-wide">
                <EnvelopeSimple size={16} className="text-amber-500" />
                <span>Priority Inbox</span>
              </h2>
              <Link href="/dashboard/gmail" className="text-xs font-mono font-bold text-amber-500 hover:text-amber-400 tracking-wider">
                Open Inbox
              </Link>
            </div>

            <div className="mt-3 flex-1 divide-y divide-white/[0.03]">
              {loading ? (
                <div className="flex h-36 items-center justify-center text-xs font-mono text-zinc-650">Loading emails...</div>
              ) : messages.length === 0 ? (
                <div className="flex h-36 flex-col items-center justify-center gap-3 text-center text-xs text-zinc-600 font-mono">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/[0.01] border border-white/[0.03] text-zinc-700">
                    <EnvelopeSimple size={18} />
                  </div>
                  <span className="font-medium text-zinc-550">No emails found.</span>
                </div>
              ) : (
                messages.slice(0, 5).map((msg) => {
                  const unread = isUnread(msg);
                  const colorClass = getAvatarColor(msg.from);
                  return (
                    <motion.div 
                      key={msg.id}
                      whileHover={{ scale: 1.006 }}
                      transition={{ type: "spring", stiffness: 450, damping: 22 }}
                    >
                      <Link
                        href={`/dashboard/gmail`}
                        className="flex items-start gap-4 py-4 transition-all hover:bg-white/[0.02] rounded-xl px-3 group/item"
                      >
                        {/* Initials Avatar */}
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold uppercase transition-all duration-300 ${colorClass}`}>
                          {getInitials(msg.from)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className={`truncate text-xs md:text-sm tracking-wide ${unread ? "font-bold text-zinc-150" : "text-zinc-400"}`}>
                              {msg.from?.replace(/<.*>/, "") ?? "Unknown"}
                            </span>
                            <span className="shrink-0 text-[9px] font-mono font-bold text-zinc-550">{formatDate(msg.receivedAt)}</span>
                          </div>
                          <div className={`mt-0.5 truncate text-xs md:text-sm ${unread ? "font-semibold text-zinc-200" : "text-zinc-400 group-hover/item:text-zinc-300"}`}>
                            {msg.subject ?? "(no subject)"}
                          </div>
                          <div className="mt-1 line-clamp-1 text-xs text-zinc-500 leading-normal font-mono">
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
      </motion.div>

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
