"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/server/lib/api-client";
import {
  PaperPlaneTilt,
  MagnifyingGlass,
  ArrowClockwise,
  CaretRight,
  X,
  EnvelopeSimple,
} from "@phosphor-icons/react";

type SentMessage = {
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

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatFullDate = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  const clean = name.replace(/<.*>/, "").trim();
  const parts = clean.split(" ").filter(Boolean);
  return parts.map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
};

const avatarColors = [
  "bg-red-500/10 text-red-400 border-red-500/20",
  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "bg-rose-500/10 text-rose-400 border-rose-500/20",
];

const getAvatarColor = (name?: string) => {
  if (!name) return "bg-zinc-800 text-zinc-400";
  const char = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return avatarColors[char % avatarColors.length];
};

/* Skeleton loader row */
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-white/[0.04]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-36 rounded bg-white/[0.04]" />
        <div className="h-2.5 w-64 rounded bg-white/[0.03]" />
      </div>
      <div className="h-2.5 w-12 rounded bg-white/[0.03]" />
    </div>
  );
}

export default function SentPage() {
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SentMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchSent = useCallback(async (showLoader = true, doRefresh = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      // 1. Fetch first 20 cached messages instantly
      const resInitial = await apiFetch("/api/gmail/messages?limit=20");
      if (resInitial.ok) {
        const json = await resInitial.json();
        const msgs: SentMessage[] = json.data?.messages ?? json.data ?? [];
        const sent = msgs.filter((m) => m.labels?.includes("SENT"));
        sent.sort((a, b) => {
          const da = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          const db = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
          return db - da;
        });
        setMessages(sent);
        setLoading(false);
      }

      if (doRefresh) {
        // Only refresh server-side cache when explicitly requested
        await apiFetch("/api/gmail/refresh", { method: "POST" });
      }

      // 2. Fetch the rest of the messages (limit=50) in the background
      const resFull = await apiFetch("/api/gmail/messages?limit=50");
      if (resFull.ok) {
        const json = await resFull.json();
        const msgs: SentMessage[] = json.data?.messages ?? json.data ?? [];
        const sent = msgs.filter((m) => m.labels?.includes("SENT"));
        sent.sort((a, b) => {
          const da = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
          const db = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
          return db - da;
        });
        setMessages(sent);
      }
    } catch {
      setError("Could not connect to the API server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSent();
  }, [fetchSent]);

  // Auto-sync every 30s (no refresh, just re-read DB cache)
  useEffect(() => {
    const interval = setInterval(() => fetchSent(false, false), 30000);
    return () => clearInterval(interval);
  }, [fetchSent]);

  // Fetch full message detail
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    apiFetch(`/api/gmail/messages/${selectedId}`)
      .then((res) => res.json())
      .then((json) => setDetail(json?.data ?? null))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSent(true, true);
  };

  const filtered = searchQuery
    ? messages.filter(
        (m) =>
          m.to?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
          m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.snippet?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="flex flex-1 min-h-screen bg-[#020206] overflow-hidden">
      {/* Left: Message list */}
      <div className="flex flex-col w-full max-w-xl border-r border-white/[0.04] shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
              <PaperPlaneTilt size={20} weight="duotone" className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-zinc-100 font-display">
                Sent
              </h1>
              <p className="text-[10px] font-mono text-zinc-600">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-zinc-500 hover:text-amber-500 hover:border-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowClockwise
              size={16}
              weight="bold"
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 focus-within:border-amber-500/30 transition-colors">
            <MagnifyingGlass size={14} className="text-zinc-600 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sent messages…"
              className="flex-1 bg-transparent text-xs font-mono text-zinc-300 placeholder:text-zinc-600 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-zinc-600 hover:text-zinc-300 cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Message list */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col">
              {[...Array(8)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-8 text-center">
              <p className="text-xs font-mono text-red-400">{error}</p>
              <button
                onClick={() => fetchSent()}
                className="text-[10px] font-mono font-bold text-amber-500 hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 px-8 text-center">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <PaperPlaneTilt size={32} weight="duotone" className="text-zinc-700" />
              </div>
              <p className="text-sm font-semibold text-zinc-400">
                {searchQuery ? "No matching messages" : "No sent messages"}
              </p>
              <p className="text-xs font-mono text-zinc-600 max-w-xs">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Messages you send will appear here"}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((msg, i) => {
                const recipient = msg.to?.[0] ?? "Unknown";
                const isActive = selectedId === msg.id;
                return (
                  <motion.button
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.25 }}
                    onClick={() => setSelectedId(isActive ? null : msg.id)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors cursor-pointer border-b border-white/[0.02] ${
                      isActive
                        ? "bg-amber-500/[0.04] border-l-2 border-l-amber-500"
                        : "hover:bg-white/[0.015]"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 border ${getAvatarColor(
                        recipient
                      )}`}
                    >
                      {getInitials(recipient)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          To: {recipient.replace(/<.*>/, "").trim()}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                          {formatDate(msg.receivedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {msg.subject || "(No subject)"}
                      </p>
                      <p className="text-[10px] text-zinc-600 truncate mt-0.5 font-mono">
                        {msg.snippet}
                      </p>
                    </div>

                    <CaretRight
                      size={12}
                      className={`shrink-0 transition-transform ${
                        isActive ? "text-amber-500 rotate-90" : "text-zinc-700"
                      }`}
                    />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Right: Detail panel */}
      <AnimatePresence mode="wait">
        {selectedId && (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="flex-1 flex flex-col overflow-y-auto p-8"
          >
            {detailLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-5 w-72 rounded bg-white/[0.04]" />
                <div className="h-3 w-48 rounded bg-white/[0.03]" />
                <div className="h-64 w-full rounded-xl bg-white/[0.02] mt-4" />
              </div>
            ) : detail ? (
              <>
                {/* Detail header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
                      {detail.subject || "(No subject)"}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600">
                        To
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {detail.to?.join(", ") ?? "Unknown"}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">
                      {formatFullDate(detail.receivedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="rounded-lg p-2 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Message body */}
                <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-6 flex-1">
                  {detail.body ? (
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
                      {detail.body}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 font-mono italic">
                      No message body available
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <EnvelopeSimple size={28} className="text-zinc-700" />
                <p className="text-xs font-mono text-zinc-600">
                  Could not load message details
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty right panel when nothing selected */}
      {!selectedId && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-6">
            <PaperPlaneTilt size={32} weight="duotone" className="text-zinc-700" />
          </div>
          <p className="text-sm font-semibold text-zinc-500">Select a message</p>
          <p className="text-[10px] font-mono text-zinc-700 max-w-xs">
            Click on a sent message to view its full content
          </p>
        </div>
      )}
    </div>
  );
}
