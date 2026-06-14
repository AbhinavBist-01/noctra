"use client";

import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { CommandBar } from "@/components/command-bar";
import { PreviewModal } from "@/components/preview-modal";
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
  const thisYear = d.getFullYear() === now.getFullYear();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (thisYear) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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
  [...msgs].sort((a, b) => (priorityOrder[a.priority ?? "normal"] ?? 1) - (priorityOrder[b.priority ?? "normal"] ?? 1));

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  const initials = parts.map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return initials || "?";
};

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
  const [suggestion, setSuggestion] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const selectedMessage = selectedDetail ?? messages.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) { setSelectedDetail(null); return; }
    setDetailLoading(true);
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
      const res = await apiFetch("/api/gmail/messages?limit=30");
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      const msgs: GmailMessage[] = json.data?.messages ?? json.data ?? [];
      setMessages(sortByPriority(msgs));
      setNextCursor(json.data?.nextCursor);
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch(`/api/gmail/messages?limit=30&cursor=${nextCursor}`);
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      const newMsgs: GmailMessage[] = json.data?.messages ?? json.data ?? [];
      setMessages((prev) => sortByPriority([...prev, ...newMsgs]));
      setNextCursor(json.data?.nextCursor);
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

  const handleCommand = useCallback(async (command: string) => {
    setError(null);
    try {
      const res = await apiFetch("/api/command/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      const actions: CommandPreviewAction[] = json.data?.actions ?? [];
      if (actions.length > 0) {
        setPreview(actions);
      } else {
        setError("Command parsed but no actions found");
      }
    } catch {
      setError(`Could not connect to API at ${API}`);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.length === 0) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await apiFetch("/api/command/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: preview }),
      });
      if (!res.ok) { setError(`Execution failed: ${res.status}`); return; }
      setPreview(null);
      refresh();
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setExecuting(false);
    }
  }, [preview, refresh]);

  const isUnread = (msg: GmailMessage) =>
    !msg.labels?.includes("READ") && !msg.labels?.includes("SEEN");

  const filteredMessages = searchQuery
    ? messages.filter(
        (m) =>
          m.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.snippet?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2.5">
        <div className="relative flex-1 max-w-xl">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search mail"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-500 focus:bg-zinc-750"
          />
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-40"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <span className="text-xs text-zinc-600 tabular-nums">
          {filteredMessages.length}
        </span>
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[420px] flex-col border-r border-zinc-800">
          <div className="flex-1 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
                Loading messages...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
                {searchQuery ? "No results found" : "No messages. Try refreshing."}
              </div>
            ) : (
              <div>
                {filteredMessages.map((msg, idx) => {
                  const unread = isUnread(msg);
                  const highlight = msg.priority === "high";
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedId(msg.id)}
                      className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors ${
                        selectedId === msg.id
                          ? "bg-indigo-900/20"
                          : "hover:bg-zinc-800/40"
                      } ${unread ? "" : "border-t border-zinc-800/30"} ${
                        idx === 0 && unread ? "" : ""
                      }`}
                    >
                      <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5">
                        <div className={`h-4 w-4 rounded-full border ${highlight ? "border-yellow-500 bg-yellow-500/10" : "border-zinc-600"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${unread ? "font-semibold text-zinc-100" : "text-zinc-300"}`}>
                            {msg.from ?? "Unknown"}
                          </span>
                          <span className="shrink-0 text-xs text-zinc-500">
                            {formatDate(msg.receivedAt)}
                          </span>
                        </div>
                        <div className={`mt-0.5 truncate text-sm ${unread ? "font-medium text-zinc-200" : "text-zinc-400"}`}>
                          {msg.subject ?? "(no subject)"}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                          {msg.snippet}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full px-4 py-3 text-center text-sm text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300 disabled:opacity-40"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {!selectedMessage ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500">
              <svg className="h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">Select a message to read</span>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                  {getInitials(selectedMessage.from)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-medium text-zinc-100">
                    {selectedMessage.subject || "(no subject)"}
                  </h2>
                  <div className="mt-0.5 truncate text-sm text-zinc-400">
                    {selectedMessage.from}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-zinc-500">
                  <div>{formatFullDate(selectedMessage.receivedAt)}</div>
                  <div>{formatTime(selectedMessage.receivedAt)}</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-4">
                  <div className="mb-4 rounded-lg bg-zinc-800/50 px-4 py-3 text-sm text-zinc-400">
                    <div className="flex items-baseline gap-2">
                      <span className="w-12 text-xs uppercase text-zinc-500">From</span>
                      <span className="text-zinc-200">{selectedMessage.from}</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="w-12 text-xs uppercase text-zinc-500">To</span>
                      <span className="text-zinc-300">{selectedMessage.to?.join(", ")}</span>
                    </div>
                    {selectedMessage.priority === "high" && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        High priority
                      </div>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                    {detailLoading ? (
                      <span className="text-zinc-500">Loading...</span>
                    ) : (
                      selectedMessage.body ?? selectedMessage.snippet
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CommandBar
        onExecute={handleCommand}
        suggestion={suggestion}
        onClearSuggestion={() => setSuggestion(undefined)}
      />

      {preview && (
        <PreviewModal
          actions={preview}
          onActionsChange={setPreview}
          onConfirm={handleConfirm}
          onCancel={() => setPreview(null)}
          loading={executing}
        />
      )}
    </div>
  );
}
