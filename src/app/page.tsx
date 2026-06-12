"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { authClient } from "@/server/better-auth/auth-client";

type View = "inbox" | "calendar" | "drafts";

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
};

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees?: { email: string; name?: string }[];
};

type PreviewAction = {
  id: string;
  type: "email_draft" | "email_send" | "calendar_invite";
  to?: string[];
  subject?: string;
  body?: string;
  title?: string;
  start?: string;
  end?: string;
  attendees?: { email: string; name?: string }[];
};

const isEmailAction = (a: PreviewAction): a is PreviewAction & { type: "email_draft" | "email_send" } =>
  a.type === "email_draft" || a.type === "email_send";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const fetchApi = (path: string, init?: RequestInit) =>
  fetch(`${API}${path}`, { ...init, credentials: "include" });

const formatDate = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
};

const Sidebar = ({
  view,
  onViewChange,
  session,
  onSignIn,
  onSignOut,
}: {
  view: View;
  onViewChange: (v: View) => void;
  session: { user: { email: string; name?: string } } | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) => {
  const items: { key: View; label: string; icon: string }[] = [
    { key: "inbox", label: "Inbox", icon: "📬" },
    { key: "calendar", label: "Calendar", icon: "📅" },
    { key: "drafts", label: "Drafts", icon: "📝" },
  ];

  return (
    <nav className="flex w-56 flex-col gap-1 border-r border-zinc-800 bg-zinc-900/50 p-3">
      <div className="mb-4 px-3 pt-2 text-lg font-semibold tracking-tight text-zinc-400">
        Noctra
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onViewChange(item.key)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            view === item.key
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}

      <div className="mt-auto border-t border-zinc-800 pt-3">
        {session ? (
          <div className="space-y-2 px-3">
            <div className="truncate text-xs text-zinc-500">
              {session.user.email}
            </div>
            <button
              onClick={onSignOut}
              className="w-full rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
};

const InboxList = ({
  messages,
  selectedId,
  onSelect,
  loading,
  hasMore,
  onLoadMore,
}: {
  messages: GmailMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) => {
  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
        No messages. Try refreshing.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg.id)}
          className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-800/50 ${
            selectedId === msg.id ? "bg-zinc-800" : ""
          }`}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-zinc-100">
              {msg.from ?? "Unknown"}
            </span>
            <span className="text-xs text-zinc-500">
              {formatDate(msg.receivedAt)}
            </span>
          </div>
          <div className="mt-0.5 text-sm text-zinc-300">
            {msg.subject ?? "(no subject)"}
          </div>
          <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
            {msg.snippet}
          </div>
        </button>
      ))}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full px-4 py-3 text-center text-sm text-zinc-500 transition-colors hover:bg-zinc-800/50 hover:text-zinc-300 disabled:opacity-40"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
};

const CalendarView = ({
  events,
  loading,
}: {
  events: CalendarEvent[];
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
        Loading events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
        No upcoming events.
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800">
      {events.map((evt) => (
        <div key={evt.id} className="px-4 py-3">
          <div className="text-sm font-medium text-zinc-100">{evt.title}</div>
          <div className="mt-0.5 text-xs text-zinc-400">
            {formatDate(evt.start)} — {formatDate(evt.end)}
          </div>
          {evt.attendees && evt.attendees.length > 0 && (
            <div className="mt-1 text-xs text-zinc-500">
              {evt.attendees.map((a) => a.email).join(", ")}
            </div>
          )}
          {evt.description && (
            <div className="mt-1 line-clamp-2 text-xs text-zinc-500">
              {evt.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const MessageDetail = ({
  message,
  loading,
  onReply,
  onForward,
}: {
  message: GmailMessage | null;
  loading: boolean;
  onReply: (msg: GmailMessage) => void;
  onForward: (msg: GmailMessage) => void;
}) => {
  if (!message) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
        Select a message to view
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-lg font-medium text-zinc-100">
          {message.subject}
        </div>
        <div className="mt-2 text-sm text-zinc-400">From: {message.from}</div>
        <div className="text-sm text-zinc-400">
          To: {message.to?.join(", ")}
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {formatDate(message.receivedAt)}
        </div>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {loading ? "Loading..." : message.body || message.snippet}
        </div>
      </div>

      <div className="flex gap-2 border-t border-zinc-800 p-3">
        <button
          onClick={() => onReply(message)}
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
        >
          Reply
        </button>
        <button
          onClick={() => onForward(message)}
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
        >
          Forward
        </button>
      </div>
    </div>
  );
};

const CommandBar = ({
  onExecute,
  suggestion,
  onClearSuggestion,
}: {
  onExecute: (cmd: string) => void;
  suggestion?: string;
  onClearSuggestion: () => void;
}) => {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (suggestion) {
      setInput(suggestion);
      ref.current?.focus();
    }
  }, [suggestion]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInput("");
        onClearSuggestion();
        ref.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClearSuggestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onExecute(input.trim());
      setInput("");
      onClearSuggestion();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900 px-4 py-3"
    >
      <span className="text-xs font-medium text-zinc-500">CMD</span>
      <input
        ref={ref}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a command... (e.g. 'Send email to friend@example.com saying hello')"
        className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600"
      />
      <button
        type="submit"
        disabled={!input.trim()}
        className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
};

const PreviewModal = ({
  actions,
  onActionsChange,
  onConfirm,
  onCancel,
  loading,
}: {
  actions: PreviewAction[];
  onActionsChange: (actions: PreviewAction[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => {
  if (actions.length === 0) return null;

  const toggleMode = (id: string) => {
    onActionsChange(
      actions.map((a) =>
        a.id === id && isEmailAction(a)
          ? { ...a, type: a.type === "email_draft" ? "email_send" : "email_draft" }
          : a,
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="text-base font-semibold text-zinc-100">
          Preview Actions
        </div>
        <div className="mt-3 space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {action.type === "email_draft"
                    ? "📝 Draft Email"
                    : action.type === "email_send"
                      ? "📨 Send Email"
                      : "📅 Calendar Invite"}
                </div>
                {isEmailAction(action) && (
                  <button
                    onClick={() => toggleMode(action.id)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                      action.type === "email_draft"
                        ? "bg-amber-900/50 text-amber-400 hover:bg-amber-800/50"
                        : "bg-emerald-900/50 text-emerald-400 hover:bg-emerald-800/50"
                    }`}
                  >
                    {action.type === "email_draft" ? "Draft" : "Send"}
                  </button>
                )}
              </div>
              {action.type !== "calendar_invite" && (
                <>
                  <div className="mt-1 text-sm text-zinc-100">
                    To: {action.to?.join(", ")}
                  </div>
                  <div className="text-sm text-zinc-300">
                    Subject: {action.subject}
                  </div>
                  <div className="line-clamp-2 text-xs text-zinc-400">
                    {action.body}
                  </div>
                </>
              )}
              {action.type === "calendar_invite" && (
                <>
                  <div className="mt-1 text-sm text-zinc-100">
                    {action.title}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {action.start && formatDate(action.start)} —{" "}
                    {action.end && formatDate(action.end)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {action.attendees?.map((a) => a.email).join(", ")}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-40"
          >
            {loading ? "Executing..." : "Confirm & Execute"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [view, setView] = useState<View>("inbox");
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<GmailMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewAction[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [session, setSession] = useState<{ user: { email: string; name?: string } } | null>(null);
  const [suggestion, setSuggestion] = useState<string | undefined>();

  const selectedMessage = selectedDetail ?? messages.find((m) => m.id === selectedId) ?? null;

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data) setSession(res.data as any);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) { setSelectedDetail(null); return; }
    setDetailLoading(true);
    fetchApi(`/api/gmail/messages/${selectedId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setSelectedDetail(json?.data ?? null))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const refreshInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNextCursor(undefined);
    try {
      const res = await fetchApi("/api/gmail/messages?limit=30");
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      setMessages(json.data?.messages ?? json.data ?? []);
      setNextCursor(json.data?.nextCursor);
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetchApi(`/api/gmail/messages?limit=30&cursor=${nextCursor}`);
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      const newMessages: GmailMessage[] = json.data?.messages ?? json.data ?? [];
      setMessages((prev) => [...prev, ...newMessages]);
      setNextCursor(json.data?.nextCursor);
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

  const refreshCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi("/api/calendar/events");
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      setEvents(json.data?.events ?? json.data ?? []);
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "inbox") refreshInbox();
    if (view === "calendar") refreshCalendar();
  }, [view, refreshInbox, refreshCalendar]);

  const handleCommand = useCallback(
    async (command: string) => {
      setError(null);
      try {
        const res = await fetchApi("/api/command/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        });
        if (!res.ok) { setError(`Server error: ${res.status}`); return; }
        const json = await res.json();
        const actions: PreviewAction[] = json.data?.actions ?? [];
        if (actions.length > 0) {
          setPreview(actions);
        } else {
          setError("Command parsed but no actions found");
        }
      } catch {
        setError(`Could not connect to API at ${API}`);
      }
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.length === 0) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await fetchApi("/api/command/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: preview }),
      });
      if (!res.ok) { setError(`Execution failed: ${res.status}`); return; }
      setPreview(null);
      if (view === "inbox") refreshInbox();
      if (view === "calendar") refreshCalendar();
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setExecuting(false);
    }
  }, [preview, view, refreshInbox, refreshCalendar]);

  const handleSignIn = useCallback(async () => {
    await authClient.signIn.social({ provider: "github" });
  }, []);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    setSession(null);
  }, []);

  const handleReply = useCallback((msg: GmailMessage) => {
    const body = msg.body || msg.snippet || "";
    setSuggestion(
      `Send email to ${msg.from ?? ""} with subject Re: ${msg.subject ?? ""} and body ${body.slice(0, 200)}`,
    );
  }, []);

  const handleForward = useCallback((msg: GmailMessage) => {
    const body = msg.body || msg.snippet || "";
    setSuggestion(
      `Send email to  with subject Fwd: ${msg.subject ?? ""} and body ${body.slice(0, 200)}`,
    );
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          view={view}
          onViewChange={setView}
          session={session}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
            <div className="text-sm font-medium text-zinc-300">
              {view === "inbox" ? "Inbox" : view === "calendar" ? "Calendar" : "Drafts"}
            </div>
            <button
              onClick={view === "inbox" ? refreshInbox : refreshCalendar}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mx-4 mt-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {view === "inbox" && (
              <InboxList
                messages={messages}
                selectedId={selectedId}
                onSelect={setSelectedId}
                loading={loading || loadingMore}
                hasMore={!!nextCursor}
                onLoadMore={loadMore}
              />
            )}
            {view === "calendar" && (
              <CalendarView events={events} loading={loading} />
            )}
            {view === "drafts" && (
              <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
                Drafts will appear here after creating them via command.
              </div>
            )}
          </div>
        </div>

        <div className="hidden w-80 border-l border-zinc-800 md:block">
          {view === "inbox" && (
            <MessageDetail
              message={selectedMessage}
              loading={detailLoading}
              onReply={handleReply}
              onForward={handleForward}
            />
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
