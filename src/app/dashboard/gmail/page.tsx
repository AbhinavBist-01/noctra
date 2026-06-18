"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/server/lib/api-client";
import { PreviewModal } from "@/components/preview-modal";
import { ComposeModal } from "@/components/compose-modal";
import type { CommandPreviewAction } from "@/shared/command";
import {
  EnvelopeSimple,
  Star,
  PaperPlaneTilt,
  FileText,
  Trash,
  MagnifyingGlass,
  Sparkle,
  ArrowClockwise,
  Plus,
  Check,
  X,
  DotsThreeVertical,
  CaretRight,
  Warning
} from "@phosphor-icons/react";

type GmailMessage = {
  id: string;
  threadId?: string;
  from?: string;
  to?: string[];
  subject?: string;
  snippet?: string;
  body?: string;
  receivedAt?: string;
  labels?: string[];
  priority?: "low" | "normal" | "high";
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

const formatFullDate = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
};

const formatTime = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const priorityOrder = { high: 0, normal: 1, low: 2 };

const sortByPriority = (msgs: GmailMessage[]) =>
  [...msgs].sort((a, b) => {
    const pDiff = (priorityOrder[a.priority ?? "normal"] ?? 1) - (priorityOrder[b.priority ?? "normal"] ?? 1);
    if (pDiff !== 0) return pDiff;
    const da = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
    const db = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
    return db - da;
  });

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
    "bg-rose-500/10 text-rose-400 border-rose-500/20",
  ];
  return colors[char % colors.length];
};

type GmailFolder = "inbox" | "starred" | "sent" | "drafts" | "trash";

export default function GmailPage() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<GmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [preview, setPreview] = useState<CommandPreviewAction[] | null>(null);
  const [executing, setExecuting] = useState(false);
  
  // Folders and Search
  const [currentFolder, setCurrentFolder] = useState<GmailFolder>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  
  // AI Compose & Smart Reply
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState<{ to: string; subject: string; body: string } | undefined>();
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [generatingReply, setGeneratingReply] = useState<string | null>(null);

  // Webhooks Log Drawer
  const [webhookLog, setWebhookLog] = useState<{ id: string; timestamp: string; type: string; event: string; status: string; detail?: string }[]>([]);
  const [showWebhookLog, setShowWebhookLog] = useState(false);
  
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchWebhookLog = useCallback(async () => {
    try {
      const res = await apiFetch("/api/webhooks/admin/log");
      if (res.ok) {
        const json = await res.json();
        setWebhookLog(json.data?.entries ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  const selectedMessage = selectedDetail ?? messages.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) { setSelectedDetail(null); return; }
    setDetailLoading(true);
    setSummary(null);
    apiFetch(`/api/gmail/messages/${selectedId}`)
      .then((res) => res.json() ?? null)
      .then((json) => setSelectedDetail(json?.data ?? null))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNextCursor(undefined);
    try {
      await apiFetch("/api/gmail/refresh", { method: "POST" });
      const res = await apiFetch("/api/gmail/messages?limit=40");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Server error: ${res.status}`);
        return;
      }
      const json = await res.json();
      const msgs: GmailMessage[] = json.data?.messages ?? json.data ?? [];
      setMessages(sortByPriority(msgs));
      setNextCursor(json.data?.nextCursor);
    } catch { setError(`Could not connect to API at ${API}`); }
    finally { setLoading(false); }
  }, []);

  // Silent background sync (no loading spinner)
  const silentSync = useCallback(async () => {
    try {
      const res = await apiFetch("/api/gmail/messages?limit=40");
      if (!res.ok) return;
      const json = await res.json();
      const msgs: GmailMessage[] = json.data?.messages ?? json.data ?? [];
      setMessages(sortByPriority(msgs));
      setNextCursor(json.data?.nextCursor);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-sync every 30 seconds
  useEffect(() => {
    const interval = setInterval(silentSync, 30000);
    return () => clearInterval(interval);
  }, [silentSync]);

  useEffect(() => {
    fetchWebhookLog();
    const interval = setInterval(fetchWebhookLog, 5000);
    return () => clearInterval(interval);
  }, [fetchWebhookLog]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch(`/api/gmail/messages?limit=30&cursor=${nextCursor}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Server error: ${res.status}`);
        return;
      }
      const json = await res.json();
      const newMsgs: GmailMessage[] = json.data?.messages ?? json.data ?? [];
      setMessages((prev) => sortByPriority([...prev, ...newMsgs]));
      setNextCursor(json.data?.nextCursor);
    } catch { setError(`Could not connect to API at ${API}`); }
    finally { setLoadingMore(false); }
  }, [nextCursor]);

  const handleSummarize = useCallback(async () => {
    if (!selectedMessage) return;
    setSummarizing(true); setError(null);
    try {
      const res = await apiFetch("/api/gmail/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selectedMessage.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Summarize failed: ${res.status}`);
        return;
      }
      const json = await res.json();
      setSummary(json.data?.summary ?? null);
    } catch { setError(`Could not connect to API at ${API}`); }
    finally { setSummarizing(false); }
  }, [selectedMessage]);

  const handleTrash = useCallback(async (messageId: string) => {
    try {
      const res = await apiFetch(`/api/gmail/messages/${messageId}/trash`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Trash failed: ${res.status}`);
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      if (selectedId === messageId) setSelectedId(null);
    } catch { setError("Could not connect to API"); }
  }, [selectedId]);

  const handleSend = useCallback(async (msg: { to: string; subject: string; body: string }) => {
    setSending(true);
    try {
      const res = await apiFetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: [msg.to],
          subject: msg.subject,
          body: msg.body,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Send failed: ${res.status}`);
        return;
      }
      setComposeOpen(false);
      setComposeDefaults(undefined);
      refresh();
    } catch { setError("Could not connect to API"); }
    finally { setSending(false); }
  }, [refresh]);

  const handleGenerateSmartReply = async (type: "acknowledge" | "decline" | "more_time") => {
    if (!selectedMessage) return;
    setGeneratingReply(type);
    
    let command = "";
    if (type === "acknowledge") {
      command = `Draft a polite email to ${selectedMessage.from} acknowledging receipt of their message about "${selectedMessage.subject}" and stating that I'll look into it soon.`;
    } else if (type === "decline") {
      command = `Draft a polite email to ${selectedMessage.from} declining their request regarding "${selectedMessage.subject}" due to current workload.`;
    } else if (type === "more_time") {
      command = `Draft an email to ${selectedMessage.from} asking for a few more days to get back to them regarding "${selectedMessage.subject}".`;
    }

    try {
      const res = await apiFetch("/api/command/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (res.ok) {
        const json = await res.json();
        const actions = json.data?.actions ?? [];
        const mailAction = actions.find((a: any) => a.type === "email_draft" || a.type === "email_send");
        if (mailAction) {
          setComposeDefaults({
            to: mailAction.to?.[0] ?? selectedMessage.from ?? "",
            subject: mailAction.subject ?? `Re: ${selectedMessage.subject}`,
            body: mailAction.body ?? "",
          });
          setComposeOpen(true);
        }
      }
    } catch {
      setError("Failed to generate smart reply");
    } finally {
      setGeneratingReply(null);
    }
  };

  const isUnread = (msg: GmailMessage) =>
    msg.labels?.includes("UNREAD") ?? false;

  // Filtering messages according to selected folder & search
  const getFilteredMessages = () => {
    let list = [...messages];
    
    // 1. Folder Filters
    if (currentFolder === "starred") {
      list = list.filter((m) => m.priority === "high");
    } else if (currentFolder === "trash") {
      list = list.filter((m) => m.labels?.includes("TRASH"));
    } else {
      // Don't show trashed items in inbox/sent/drafts
      list = list.filter((m) => !m.labels?.includes("TRASH"));
      if (currentFolder === "sent") {
        list = list.filter((m) => m.labels?.includes("SENT"));
      } else if (currentFolder === "drafts") {
        list = list.filter((m) => m.labels?.includes("DRAFT"));
      }
    }

    // 2. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.from?.toLowerCase().includes(q) ||
          m.subject?.toLowerCase().includes(q) ||
          m.snippet?.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const keyboardList = getFilteredMessages();

  useEffect(() => {
    if (focusedIndex >= keyboardList.length) setFocusedIndex(Math.max(0, keyboardList.length - 1));
  }, [keyboardList.length, focusedIndex]);

  // Folder configs
  const folders = [
    { id: "inbox" as const, label: "Inbox", icon: (active: boolean) => <EnvelopeSimple size={18} weight={active ? "fill" : "regular"} />, count: messages.filter(isUnread).length },
    { id: "starred" as const, label: "Starred", icon: (active: boolean) => <Star size={18} weight={active ? "fill" : "regular"} className={active ? "text-amber-500" : ""} />, count: messages.filter((m) => m.priority === "high").length },
    { id: "sent" as const, label: "Sent Mail", icon: (active: boolean) => <PaperPlaneTilt size={18} weight={active ? "fill" : "regular"} />, count: 0 },
    { id: "drafts" as const, label: "Drafts", icon: (active: boolean) => <FileText size={18} weight={active ? "fill" : "regular"} />, count: 0 },
    { id: "trash" as const, label: "Trash", icon: (active: boolean) => <Trash size={18} weight={active ? "fill" : "regular"} />, count: 0 },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#020206] text-zinc-100 font-sans tracking-wide">
      
      {/* Background radial grid overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(ellipse at center, #f59e0b 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />
      
      {/* Top Google-style Search & Action Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/[0.04] bg-[#020206]/85 px-6 py-4">
        <div className="relative flex max-w-2xl flex-1 items-center">
          <MagnifyingGlass className="absolute left-4 h-4 w-4 text-zinc-550" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mail by sender, subject, or content..."
            className="w-full rounded-xl border border-white/[0.05] bg-[#020206]/85 py-2.5 pr-4 pl-11 text-xs md:text-sm text-zinc-100 placeholder-zinc-700 outline-none transition-all focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-4 py-2.5 text-xs font-mono font-bold text-zinc-300 transition-colors disabled:opacity-40 shadow-sm cursor-pointer hover:border-white/[0.12]"
          >
            <ArrowClockwise className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
          
          <button
            onClick={() => { setShowWebhookLog(!showWebhookLog); if (!showWebhookLog) fetchWebhookLog(); }}
            className={`rounded-xl border px-4 py-2.5 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer ${
              showWebhookLog 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                : "border-white/[0.06] bg-white/[0.02] text-zinc-455 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-zinc-200"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${webhookLog.length > 0 ? "bg-green-500" : "bg-zinc-650"}`} />
              Webhook Activity
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="relative z-10 mx-6 mt-3 rounded-xl border border-red-950 bg-red-950/20 px-4 py-2.5 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Webhook Activity Log Drawer */}
      <AnimatePresence>
        {showWebhookLog && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 mx-6 mt-3 overflow-hidden rounded-xl border border-white/[0.04] bg-zinc-950/40 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-350">Live Webhook Log</span>
              <button onClick={fetchWebhookLog} className="text-[11px] font-mono font-bold text-amber-500 hover:text-amber-400 hover:underline">Force Refresh</button>
            </div>
            {webhookLog.length === 0 ? (
              <p className="text-xs text-zinc-600 font-mono">No push events received yet. Realtime notifications will appear here.</p>
            ) : (
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-2">
                {webhookLog.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/[0.03] bg-zinc-950/60 px-3 py-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${entry.status === "success" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />
                      <span className="font-bold text-zinc-300 uppercase">{entry.type}</span>
                      <span className="text-zinc-550">{entry.event}</span>
                      {entry.detail && <span className="text-zinc-500 font-medium">({entry.detail})</span>}
                    </div>
                    <span className="text-[10px] text-zinc-600">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Mailbox Dashboard Grid */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* Left Google-style Mailbox Folders Sidebar */}
        <div className="flex w-64 shrink-0 flex-col border-r border-white/[0.04] bg-zinc-950/20 backdrop-blur-md p-4 gap-4">
          <button
            onClick={() => {
              setComposeDefaults(undefined);
              setComposeOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 text-xs font-mono font-bold text-zinc-950 shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>COMPOSE</span>
          </button>

          <div className="flex flex-col gap-1">
            {folders.map((folder) => {
              const active = currentFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setCurrentFolder(folder.id);
                    setSelectedId(null);
                    setFocusedIndex(0);
                  }}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-white/[0.02] border border-white/[0.05] text-amber-500 shadow-sm"
                      : "text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={active ? "text-amber-500" : "text-zinc-500"}>{folder.icon(active)}</span>
                    <span>{folder.label}</span>
                  </span>
                  {folder.count > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                      active ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-white/[0.02] text-zinc-550 border border-white/[0.04]"
                    }`}>
                      {folder.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Email Threads List Panel */}
        <div className="flex w-[460px] shrink-0 flex-col border-r border-white/[0.04] bg-zinc-950/10">
          <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-3 text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
            <span>{currentFolder}</span>
            <span>{keyboardList.length} Messages</span>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-xs font-mono text-zinc-650">Syncing inbox...</div>
            ) : keyboardList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-xs text-zinc-600 text-center px-4 font-mono">
                <span>No emails in this folder.</span>
              </div>
            ) : (
              keyboardList.map((msg, idx) => {
                const unread = isUnread(msg);
                const isSelected = selectedId === msg.id;
                const focused = idx === focusedIndex;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                    onClick={() => { setSelectedId(msg.id); setFocusedIndex(idx); }}
                    className={`flex cursor-pointer items-start gap-4 px-4 py-4.5 transition-all duration-200 border-l-2 ${
                      isSelected 
                        ? "bg-white/[0.03] border-amber-500 shadow-inner" 
                        : focused 
                        ? "bg-white/[0.01] border-white/[0.08]" 
                        : "hover:bg-white/[0.005] border-transparent"
                    }`}
                  >
                    {/* Circle Importance Dot */}
                    <div className="mt-1.5 flex shrink-0 items-center justify-center">
                      <div className={`h-2 w-2 rounded-full ${
                        msg.priority === "high" 
                          ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" 
                          : "bg-zinc-800"
                      }`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-xs tracking-wide ${unread ? "font-bold text-zinc-100" : "font-medium text-zinc-400"}`}>
                          {msg.from?.replace(/<.*>/, "") ?? "Unknown"}
                        </span>
                        <span className="shrink-0 text-[9px] font-mono font-bold text-zinc-550">{formatDate(msg.receivedAt)}</span>
                      </div>
                      <div className={`mt-0.5 truncate text-xs ${unread ? "font-semibold text-zinc-200" : "text-zinc-400"}`}>
                        {msg.subject || "(no subject)"}
                      </div>
                      <div className="mt-1 line-clamp-1 text-[11px] text-zinc-550 leading-normal font-mono">{msg.snippet}</div>
                    </div>
                  </motion.div>
                );
              })
            )}

            {nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-4 text-center text-xs font-mono font-bold text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.01] transition-colors disabled:opacity-40 cursor-pointer"
              >
                {loadingMore ? "Loading more..." : "Load older messages"}
              </button>
            )}
          </div>
        </div>

        {/* Selected Email Detailed Reading Pane */}
        <div className="flex flex-1 flex-col bg-[#020206]/40 backdrop-blur-md">
          {!selectedMessage ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-650 font-mono text-xs">
              <EnvelopeSimple size={28} className="text-zinc-800" />
              <span className="font-semibold tracking-wider">Select an email from the list to read</span>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden">
              
              {/* Detail Header */}
              <div className="flex items-start justify-between border-b border-white/[0.04] px-6 py-5 bg-[#020206]/60">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold uppercase ${getAvatarColor(selectedMessage.from)}`}>
                    {getInitials(selectedMessage.from)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-extrabold text-zinc-100 line-clamp-1">{selectedMessage.subject || "(no subject)"}</h2>
                    <div className="mt-0.5 text-xs text-zinc-450 font-mono">
                      From: <span className="font-semibold text-zinc-300 font-sans">{selectedMessage.from}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 text-right text-xs">
                  <div className="font-mono font-bold text-zinc-550">{formatFullDate(selectedMessage.receivedAt)} · {formatTime(selectedMessage.receivedAt)}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrash(selectedMessage.id)}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-red-900/50 hover:bg-red-950/10 px-3.5 py-2 text-xs font-mono font-bold text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleSummarize}
                      disabled={summarizing || detailLoading}
                      className="rounded-xl bg-amber-500/10 hover:bg-amber-500 px-3.5 py-2 text-xs font-mono font-bold text-amber-500 hover:text-zinc-950 border border-amber-500/20 hover:border-amber-500 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {summarizing ? "Summarizing..." : "AI Summarize"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Details Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* AI Summary Card */}
                <AnimatePresence>
                  {summary && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-lg shadow-amber-500/[0.02]"
                    >
                      <div className="mb-2 flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase">
                        <span className="flex items-center gap-1.5">
                          <Sparkle size={12} weight="fill" className="text-amber-500 animate-pulse" />
                          AI Co-Pilot Summary
                        </span>
                        <button onClick={() => setSummary(null)} className="text-zinc-600 hover:text-zinc-400 text-sm font-bold">×</button>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-200 font-medium font-sans">{summary}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Metadata Card */}
                <div className="rounded-xl border border-white/[0.04] bg-[#020206]/40 px-4.5 py-3.5 text-xs space-y-2 font-mono">
                  <div className="flex items-baseline gap-3">
                    <span className="w-10 font-bold text-zinc-500 uppercase">To:</span>
                    <span className="text-zinc-350">{selectedMessage.to?.join(", ")}</span>
                  </div>
                  {selectedMessage.priority === "high" && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 w-max text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" /> High Priority Alert
                    </div>
                  )}
                </div>

                {/* Main Email Body Content */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 font-normal select-text">
                  {detailLoading ? (
                    <div className="flex justify-center py-10 text-zinc-650 text-xs font-mono">Loading email body...</div>
                  ) : (
                    selectedMessage.body ?? selectedMessage.snippet
                  )}
                </div>

                {/* Google-style AI Smart Quick Reply Suggestions */}
                {!detailLoading && (
                  <div className="border-t border-white/[0.04] pt-6 mt-8">
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-1.5">
                      <Sparkle size={14} weight="fill" className="text-amber-500" />
                      AI Smart Replies
                    </h3>
                    
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        onClick={() => handleGenerateSmartReply("acknowledge")}
                        disabled={generatingReply !== null}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-amber-500/30 hover:bg-amber-500/5 px-4 py-2.5 text-xs font-mono font-bold text-zinc-400 hover:text-amber-550 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {generatingReply === "acknowledge" ? "Generating..." : "🤝 Acknowledge Receipt"}
                      </button>
                      
                      <button
                        onClick={() => handleGenerateSmartReply("more_time")}
                        disabled={generatingReply !== null}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-amber-500/30 hover:bg-amber-500/5 px-4 py-2.5 text-xs font-mono font-bold text-zinc-400 hover:text-amber-555 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {generatingReply === "more_time" ? "Generating..." : "⏳ Ask for More Time"}
                      </button>

                      <button
                        onClick={() => handleGenerateSmartReply("decline")}
                        disabled={generatingReply !== null}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-red-500/30 hover:bg-red-500/5 px-4 py-2.5 text-xs font-mono font-bold text-zinc-400 hover:text-red-400 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {generatingReply === "decline" ? "Generating..." : "❌ Politely Decline"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draft Compose Editor Modal */}
      {composeOpen && (
        <ComposeModal 
          onSend={handleSend} 
          onClose={() => {
            setComposeOpen(false);
            setComposeDefaults(undefined);
          }} 
          sending={sending} 
          defaults={composeDefaults}
        />
      )}

      {/* AI Preview Action Executor Modal */}
      {preview && (
        <PreviewModal
          actions={preview}
          onActionsChange={setPreview}
          onConfirm={async () => {
            if (!preview || preview.length === 0) return;
            setExecuting(true);
            try {
              const res = await apiFetch("/api/command/execute", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actions: preview }),
              });
              if (res.ok) {
                setPreview(null);
                refresh();
              }
            } catch {
              setError("Failed to execute reply draft");
            } finally {
              setExecuting(false);
            }
          }}
          onCancel={() => setPreview(null)}
          loading={executing}
        />
      )}
    </div>
  );
}
