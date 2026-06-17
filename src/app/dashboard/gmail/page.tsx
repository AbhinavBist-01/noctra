"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/server/lib/api-client";
import { PreviewModal } from "@/components/preview-modal";
import { ComposeModal } from "@/components/compose-modal";
import type { CommandPreviewAction } from "@/shared/command";

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
    "bg-teal-500/10 text-teal-400 border-teal-500/Teal",
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

  useEffect(() => { refresh(); }, [refresh]);

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
    !msg.labels?.includes("READ") && !msg.labels?.includes("SEEN");

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
    { id: "inbox" as const, label: "Inbox", icon: "📥", count: messages.filter(isUnread).length },
    { id: "starred" as const, label: "Starred", icon: "⭐", count: messages.filter((m) => m.priority === "high").length },
    { id: "sent" as const, label: "Sent Mail", icon: "📤", count: 0 },
    { id: "drafts" as const, label: "Drafts", icon: "📝", count: 0 },
    { id: "trash" as const, label: "Trash", icon: "🗑️", count: 0 },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-150">
      
      {/* Top Google-style Search & Action Bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950 px-6 py-3">
        <div className="relative flex max-w-2xl flex-1 items-center">
          <svg className="absolute left-4 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mail by sender, subject, or content..."
            className="w-full rounded-full border border-zinc-850 bg-zinc-900/50 py-2 pr-4 pl-11 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all focus:border-zinc-800 focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-800"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 px-4 py-1.5 text-xs text-zinc-400 transition-colors disabled:opacity-40"
          >
            <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
          
          <button
            onClick={() => { setShowWebhookLog(!showWebhookLog); if (!showWebhookLog) fetchWebhookLog(); }}
            className={`rounded-full border border-zinc-850 px-4 py-1.5 text-xs transition-colors ${
              showWebhookLog ? "bg-zinc-800 text-zinc-200" : "bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900"
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
        <div className="mx-6 mt-3 rounded-xl border border-red-950 bg-red-950/20 px-4 py-2.5 text-sm text-red-400">
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
            className="mx-6 mt-3 overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900/20 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Webhook Log</span>
              <button onClick={fetchWebhookLog} className="text-[11px] text-indigo-400 hover:underline">Force Refresh</button>
            </div>
            {webhookLog.length === 0 ? (
              <p className="text-xs text-zinc-600">No push events received yet. Realtime notifications will appear here.</p>
            ) : (
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-2">
                {webhookLog.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg bg-zinc-950/40 px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${entry.status === "success" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />
                      <span className="font-semibold text-zinc-300 uppercase">{entry.type}</span>
                      <span className="text-zinc-500">{entry.event}</span>
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
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Google-style Mailbox Folders Sidebar */}
        <div className="flex w-64 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950/50 p-4 gap-4">
          <button
            onClick={() => {
              setComposeDefaults(undefined);
              setComposeOpen(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 transition-all hover:scale-[1.02] active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Compose</span>
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
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-zinc-900 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-350"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">{folder.icon}</span>
                    <span>{folder.label}</span>
                  </span>
                  {folder.count > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active ? "bg-indigo-600/20 text-indigo-300" : "bg-zinc-900 text-zinc-500"
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
        <div className="flex w-[460px] shrink-0 flex-col border-r border-zinc-900 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            <span>{currentFolder}</span>
            <span>{keyboardList.length} Messages</span>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-zinc-900/30">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-sm text-zinc-600">Syncing inbox...</div>
            ) : keyboardList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-sm text-zinc-600 text-center px-4">
                <span>No emails in this folder.</span>
              </div>
            ) : (
              keyboardList.map((msg, idx) => {
                const unread = isUnread(msg);
                const isSelected = selectedId === msg.id;
                const focused = idx === focusedIndex;
                const avatarColor = getAvatarColor(msg.from);
                return (
                  <div
                    key={msg.id}
                    onClick={() => { setSelectedId(msg.id); setFocusedIndex(idx); }}
                    className={`flex cursor-pointer items-start gap-4 px-4 py-4 transition-colors ${
                      isSelected ? "bg-zinc-900/70" : focused ? "bg-zinc-900/30" : "hover:bg-zinc-900/20"
                    }`}
                  >
                    {/* Circle Importance Dot */}
                    <div className="mt-1 flex shrink-0 items-center justify-center">
                      <div className={`h-2.5 w-2.5 rounded-full ${msg.priority === "high" ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "bg-zinc-700"}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm ${unread ? "font-bold text-zinc-100" : "text-zinc-400"}`}>
                          {msg.from?.replace(/<.*>/, "") ?? "Unknown"}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-550">{formatDate(msg.receivedAt)}</span>
                      </div>
                      <div className={`mt-0.5 truncate text-sm ${unread ? "font-semibold text-zinc-200" : "text-zinc-400"}`}>
                        {msg.subject || "(no subject)"}
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs text-zinc-500 leading-normal">{msg.snippet}</div>
                    </div>
                  </div>
                );
              })
            )}

            {nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-4 text-center text-xs text-zinc-500 hover:bg-zinc-900/20 transition-colors disabled:opacity-40"
              >
                {loadingMore ? "Loading more..." : "Load older messages"}
              </button>
            )}
          </div>
        </div>

        {/* Selected Email Detailed Reading Pane */}
        <div className="flex flex-1 flex-col bg-zinc-950/20">
          {!selectedMessage ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-600">
              <svg className="h-12 w-12 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">Select an email from the list to read</span>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden">
              
              {/* Detail Header */}
              <div className="flex items-start justify-between border-b border-zinc-900 px-6 py-5 bg-zinc-950/40">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold uppercase ${getAvatarColor(selectedMessage.from)}`}>
                    {getInitials(selectedMessage.from)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-zinc-100 line-clamp-1">{selectedMessage.subject || "(no subject)"}</h2>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      From: <span className="font-medium text-zinc-300">{selectedMessage.from}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 text-right text-xs text-zinc-550">
                  <div className="font-semibold text-zinc-450">{formatFullDate(selectedMessage.receivedAt)} · {formatTime(selectedMessage.receivedAt)}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrash(selectedMessage.id)}
                      className="rounded-lg border border-zinc-850 hover:border-red-900/50 hover:bg-red-950/10 px-3 py-1 text-xs text-zinc-500 hover:text-red-400 transition-all"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleSummarize}
                      disabled={summarizing || detailLoading}
                      className="rounded-lg bg-indigo-600/15 hover:bg-indigo-600 px-3 py-1 text-xs text-indigo-400 hover:text-white border border-indigo-900/30 transition-all disabled:opacity-40"
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
                      className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-zinc-950/60 p-4 shadow-md"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                        <span>AI Co-Pilot Summary</span>
                        <button onClick={() => setSummary(null)} className="text-zinc-650 hover:text-zinc-450 text-sm">×</button>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-300 font-medium">{summary}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Metadata Card */}
                <div className="rounded-xl border border-zinc-850 bg-zinc-900/10 px-4 py-3 text-xs space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="w-10 font-bold text-zinc-550 uppercase">To:</span>
                    <span className="text-zinc-350">{selectedMessage.to?.join(", ")}</span>
                  </div>
                  {selectedMessage.priority === "high" && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 w-max text-xs font-medium text-yellow-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]" /> High Priority Alert
                    </div>
                  )}
                </div>

                {/* Main Email Body Content */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 font-normal">
                  {detailLoading ? (
                    <div className="flex justify-center py-10 text-zinc-600 text-xs">Loading email body...</div>
                  ) : (
                    selectedMessage.body ?? selectedMessage.snippet
                  )}
                </div>

                {/* Google-style AI Smart Quick Reply Suggestions */}
                {!detailLoading && (
                  <div className="border-t border-zinc-900 pt-6 mt-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-550 mb-3 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI Smart Replies
                    </h3>
                    
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        onClick={() => handleGenerateSmartReply("acknowledge")}
                        disabled={generatingReply !== null}
                        className="rounded-full border border-zinc-850 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-350 hover:text-zinc-200 transition-all disabled:opacity-40"
                      >
                        {generatingReply === "acknowledge" ? "Generating..." : "🤝 Acknowledge Receipt"}
                      </button>
                      
                      <button
                        onClick={() => handleGenerateSmartReply("more_time")}
                        disabled={generatingReply !== null}
                        className="rounded-full border border-zinc-850 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-350 hover:text-zinc-200 transition-all disabled:opacity-40"
                      >
                        {generatingReply === "more_time" ? "Generating..." : "⏳ Ask for More Time"}
                      </button>

                      <button
                        onClick={() => handleGenerateSmartReply("decline")}
                        disabled={generatingReply !== null}
                        className="rounded-full border border-zinc-850 bg-zinc-900/40 hover:border-zinc-750 hover:bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-350 hover:text-zinc-200 transition-all disabled:opacity-40"
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
