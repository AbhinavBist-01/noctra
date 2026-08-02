"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Robot,
  EnvelopeSimple,
  CalendarBlank,
  Lightning,
  Check,
  X,
  Warning,
  Sparkle,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { apiFetch } from "@/server/lib/api-client";
import { SpotlightGlowCard } from "@/components/ui/spotlight-glow-card";
import { AmbientParticles } from "@/components/ui/ambient-particles";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import type {
  CommandPreviewAction,
  CommandExecutionResult,
  EmailCommandAction,
  CalendarInviteCommandAction,
} from "@/shared/command";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type UserMessage = {
  id: string;
  role: "user";
  text: string;
};

type AgentPreviewMessage = {
  id: string;
  role: "agent";
  kind: "preview";
  actions: CommandPreviewAction[];
  warnings: string[];
  status: "pending" | "confirmed" | "cancelled";
};

type AgentResultMessage = {
  id: string;
  role: "agent";
  kind: "result";
  results: CommandExecutionResult[];
};

type AgentErrorMessage = {
  id: string;
  role: "agent";
  kind: "error";
  error: string;
};

type AgentLoadingMessage = {
  id: string;
  role: "agent";
  kind: "loading";
};

type ChatMessage =
  | UserMessage
  | AgentPreviewMessage
  | AgentResultMessage
  | AgentErrorMessage
  | AgentLoadingMessage;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const uid = () => crypto.randomUUID();

const suggestions = [
  {
    label: "Send a status update email",
    desc: "Draft and send an update about project status.",
    icon: <EnvelopeSimple size={16} weight="duotone" />,
    color: "amber",
  },
  {
    label: "Schedule a client sync tomorrow at 3pm",
    desc: "Create a calendar event and send an invite.",
    icon: <CalendarBlank size={16} weight="duotone" />,
    color: "blue",
  },
  {
    label: "Draft a reply about being late",
    desc: "Quickly reply to the last email with a notice.",
    icon: <Lightning size={16} weight="duotone" />,
    color: "violet",
  },
  {
    label: "Summarize my unread emails",
    desc: "Get a quick breakdown of your latest messages.",
    icon: <Robot size={16} weight="duotone" />,
    color: "emerald",
  },
];

const suggestionColors: Record<string, { bg: string; text: string; border: string }> = {
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "group-hover:border-amber-500/20" },
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "group-hover:border-blue-500/20" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "group-hover:border-violet-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "group-hover:border-emerald-500/20" },
};

const msgVariants = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: -8, scale: 0.97 },
};

function isEmail(action: CommandPreviewAction): action is EmailCommandAction {
  return action.type === "email_send" || action.type === "email_draft";
}

function isCalendar(action: CommandPreviewAction): action is CalendarInviteCommandAction {
  return action.type === "calendar_invite";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */
/*  Action Card                                                        */
/* ------------------------------------------------------------------ */

function ActionCard({
  action,
  status,
  onConfirm,
  onCancel,
}: {
  action: CommandPreviewAction;
  status: "pending" | "confirmed" | "cancelled";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const email = isEmail(action);
  const calendar = isCalendar(action);
  const isEmail_ = action.type === "email_send" || action.type === "email_draft";

  const typeLabel = action.type === "email_send"
    ? "Send Email"
    : action.type === "email_draft"
      ? "Draft Email"
      : "Calendar Invite";

  const accentColor = isEmail_
    ? { ring: "ring-amber-500/20", glow: "bg-amber-500/[0.03]", icon: "bg-amber-500/10 text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
    : { ring: "ring-blue-500/20",  glow: "bg-blue-500/[0.03]",  icon: "bg-blue-500/10 text-blue-400",   badge: "bg-blue-500/10 text-blue-400 border-blue-500/20"  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border border-white/[0.07] ${accentColor.glow} ring-1 ${accentColor.ring} overflow-hidden`}
    >
      {/* Subtle top gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${isEmail_ ? "bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" : "bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"}`} />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${accentColor.icon}`}>
              {email
                ? <EnvelopeSimple size={18} weight="duotone" />
                : <CalendarBlank size={18} weight="duotone" />
              }
            </div>
            <div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${accentColor.badge}`}>
                {typeLabel}
              </span>
            </div>
          </div>
          {/* Status pill */}
          {status === "confirmed" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Check size={10} weight="bold" /> Confirmed
            </span>
          )}
          {status === "cancelled" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-600 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full">
              <X size={10} weight="bold" /> Cancelled
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.04]" />

        {/* Details */}
        {email && (
          <div className="space-y-2.5">
            <DetailRow label="To" value={(action as EmailCommandAction).to.join(", ")} />
            <DetailRow label="Subject" value={(action as EmailCommandAction).subject} highlight />
            <div className="flex gap-3">
              <span className="text-[11px] font-mono text-zinc-600 shrink-0 mt-0.5 w-14">Body</span>
              <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-4 font-sans">
                {(action as EmailCommandAction).body}
              </p>
            </div>
          </div>
        )}

        {calendar && (
          <div className="space-y-2.5">
            <DetailRow label="Title" value={(action as CalendarInviteCommandAction).title} highlight />
            <DetailRow
              label="Time"
              value={`${formatTime((action as CalendarInviteCommandAction).start)} → ${formatTime((action as CalendarInviteCommandAction).end)}`}
            />
            {(action as CalendarInviteCommandAction).attendees.length > 0 && (
              <DetailRow
                label="Guests"
                value={(action as CalendarInviteCommandAction).attendees.map((a) => a.name || a.email).join(", ")}
              />
            )}
          </div>
        )}

        {/* Action buttons */}
        {status === "pending" && (
          <div className="flex items-center gap-2.5 pt-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/25 px-4 py-2 text-xs font-mono font-bold text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm"
            >
              <Check size={13} weight="bold" />
              Confirm &amp; Execute
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2 text-xs font-mono font-bold text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12] transition-all cursor-pointer"
            >
              <X size={13} weight="bold" />
              Dismiss
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="text-[11px] font-mono text-zinc-600 shrink-0 mt-0.5 w-14">{label}</span>
      <span className={`text-[12px] font-mono leading-relaxed ${highlight ? "text-zinc-200 font-semibold" : "text-zinc-400"}`}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result Card                                                        */
/* ------------------------------------------------------------------ */

function ResultCard({ result }: { result: CommandExecutionResult }) {
  const ok = result.status === "success";
  const label = result.type === "email_send"
    ? "Email sent successfully"
    : result.type === "email_draft"
      ? "Email saved to drafts"
      : "Calendar event created";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        ok
          ? "border-emerald-500/20 bg-emerald-500/[0.06]"
          : "border-red-500/20 bg-red-500/[0.06]"
      }`}
    >
      <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
        {ok ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-mono font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}>
          {label}
        </p>
        {result.error && (
          <p className="text-[11px] text-red-500/70 font-mono mt-0.5 truncate">{result.error}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typing Dots                                                        */
/* ------------------------------------------------------------------ */

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-2 h-2 rounded-full bg-amber-500/50"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

const agentPlaceholders = [
  "Send a status update to the team…",
  "Schedule a meeting tomorrow at 3pm…",
  "Summarize my unread emails…",
  "Draft a reply saying I'll be late…",
  "Book a 1:1 with Alex next Monday…",
  "Send the project brief to the client…",
];

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem("noctra_agent_conversations");
      if (saved) {
        setMessages(JSON.parse(saved) as ChatMessage[]);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  }, []);

  // Save to localStorage when messages change
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("noctra_agent_conversations", JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save conversations:", e);
    }
  }, [messages, isMounted]);

  /* Auto-scroll ---------------------------------------------------- */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  /* Send command --------------------------------------------------- */
  const sendCommand = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;

      const userMsg: UserMessage = { id: uid(), role: "user", text: text.trim() };
      const loadingId = uid();

      setMessages((m) => [
        ...m,
        userMsg,
        { id: loadingId, role: "agent", kind: "loading" },
      ]);
      setInput("");
      setIsSending(true);

      try {
        const res = await apiFetch("/api/command/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: text.trim(),
            history: messages.map((m) => {
              if (m.role === "user") {
                return { role: "user", content: m.text };
              } else {
                let content = "";
                if (m.kind === "preview") {
                  content = `Actions prepared: ${JSON.stringify(m.actions)}. Warnings: ${m.warnings.join(", ")}`;
                } else if (m.kind === "result") {
                  content = `Execution result: ${JSON.stringify(m.results)}`;
                } else if (m.kind === "error") {
                  content = `Error: ${m.error}`;
                }
                return { role: "assistant", content };
              }
            }),
          }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => null)) as { error?: { message?: string } | string } | null;
          const errMsg = typeof errData?.error === "object" ? errData?.error?.message : errData?.error;
          throw new Error(errMsg ?? `Preview failed (${res.status})`);
        }

        const json = (await res.json()) as { data: { actions: CommandPreviewAction[]; warnings?: string[] } };

        const previewMsg: AgentPreviewMessage = {
          id: uid(),
          role: "agent",
          kind: "preview",
          actions: json.data.actions,
          warnings: json.data.warnings ?? [],
          status: "pending",
        };

        setMessages((m) => m.filter((msg) => msg.id !== loadingId).concat(previewMsg));
      } catch (err) {
        const errorMsg: AgentErrorMessage = {
          id: uid(),
          role: "agent",
          kind: "error",
          error: err instanceof Error ? err.message : "Something went wrong",
        };
        setMessages((m) => m.filter((msg) => msg.id !== loadingId).concat(errorMsg));
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages],
  );

  /* Confirm actions ------------------------------------------------ */
  const confirmActions = useCallback(async (previewId: string, actions: CommandPreviewAction[]) => {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === previewId && msg.role === "agent" && msg.kind === "preview"
          ? { ...msg, status: "confirmed" as const }
          : msg,
      ),
    );

    const loadingId = uid();
    setMessages((m) => [...m, { id: loadingId, role: "agent", kind: "loading" }]);

    try {
      const res = await apiFetch("/api/command/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? `Execute failed (${res.status})`);
      }

      const json = (await res.json()) as { data: { results: CommandExecutionResult[] } };

      const resultMsg: AgentResultMessage = {
        id: uid(),
        role: "agent",
        kind: "result",
        results: json.data.results,
      };

      setMessages((m) => m.filter((msg) => msg.id !== loadingId).concat(resultMsg));
    } catch (err) {
      const errorMsg: AgentErrorMessage = {
        id: uid(),
        role: "agent",
        kind: "error",
        error: err instanceof Error ? err.message : "Execution failed",
      };
      setMessages((m) => m.filter((msg) => msg.id !== loadingId).concat(errorMsg));
    }
  }, []);

  /* Cancel actions ------------------------------------------------- */
  const cancelActions = useCallback((previewId: string) => {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === previewId && msg.role === "agent" && msg.kind === "preview"
          ? { ...msg, status: "cancelled" as const }
          : msg,
      ),
    );
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex flex-col h-full bg-[#020208] overflow-hidden">
      <AmbientParticles className="opacity-25 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/[0.05] bg-[#020208]/90 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Robot size={18} weight="duotone" className="text-amber-500" />
          </div>
          <div>
            <span className="font-display font-extrabold text-sm text-zinc-100 tracking-wide">Co-Pilot</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-mono text-emerald-500/70">Online</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setMessages([]);
              try { localStorage.removeItem("noctra_agent_conversations"); } catch { /* ignore */ }
            }}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 px-3.5 py-2 text-xs font-mono font-bold text-zinc-500 transition-all cursor-pointer"
          >
            <ClockCounterClockwise size={13} />
            Clear
          </motion.button>
        )}
      </div>

      {/* Scrollable chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 pt-8 pb-6 scroll-smooth">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Empty state */}
          <AnimatePresence>
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center gap-6 pt-[12vh] pb-8"
              >
                {/* Hero icon */}
                <div className="relative">
                  <div className="absolute -inset-8 bg-amber-500/8 blur-3xl rounded-full pointer-events-none" />
                  <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7 shadow-2xl shadow-black/40">
                    <Robot size={48} weight="duotone" className="text-amber-400" />
                  </div>
                </div>

                {/* Headline */}
                <div className="text-center space-y-2 max-w-sm">
                  <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 font-display">
                    What can I help with?
                  </h1>
                  <p className="text-sm text-zinc-500 font-mono leading-relaxed">
                    Send emails, schedule meetings, or automate tasks — just describe what you need.
                  </p>
                </div>

                {/* Suggestion cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-2">
                  {suggestions.map((s, i) => {
                    const colors = suggestionColors[s.color]!;
                    return (
                      <motion.button
                        key={s.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                        onClick={() => setInput(s.label)}
                        className={`group flex items-center gap-3 text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] p-4 transition-all duration-200 hover:border-white/[0.1] hover:scale-[1.02] cursor-pointer ${colors.border}`}
                      >
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${colors.bg} ${colors.text}`}>
                          {s.icon}
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 leading-snug">{s.label}</p>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Tip */}
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-700">
                  <Sparkle size={11} weight="duotone" className="text-amber-500/50" />
                  Press Enter or click the arrow to send
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                variants={msgVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                layout
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* User bubble */}
                {msg.role === "user" && (
                  <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-gradient-to-br from-amber-500/[0.15] to-amber-500/[0.08] border border-amber-500/20 px-5 py-3 shadow-lg shadow-amber-500/5">
                    <p className="text-sm text-zinc-200 leading-relaxed">{msg.text}</p>
                  </div>
                )}

                {/* Agent messages */}
                {msg.role === "agent" && (
                  <div className="flex gap-3 max-w-[92%] w-full">
                    {/* Avatar */}
                    <div className="shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Robot size={14} weight="duotone" className="text-amber-400" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3 flex-1 min-w-0">
                      {msg.kind === "loading" && <TypingDots />}

                      {msg.kind === "preview" && (
                        <>
                          {msg.warnings.length > 0 && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-3 text-xs font-mono text-yellow-400">
                              <Warning size={14} weight="bold" className="shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                {msg.warnings.map((w, i) => (
                                  <p key={i}>{w}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-[11px] text-zinc-500 font-mono">
                            I&apos;ve prepared {msg.actions.length} action{msg.actions.length !== 1 ? "s" : ""} — review and confirm below:
                          </p>
                          <div className="space-y-3">
                            {msg.actions.map((action) => (
                              <ActionCard
                                key={action.id}
                                action={action}
                                status={msg.status}
                                onConfirm={() => confirmActions(msg.id, msg.actions)}
                                onCancel={() => cancelActions(msg.id)}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {msg.kind === "result" && (
                        <div className="space-y-2.5">
                          <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
                            <Check size={12} weight="bold" className="text-emerald-400" />
                            Execution complete
                          </p>
                          {msg.results.map((r) => (
                            <ResultCard key={r.actionId} result={r} />
                          ))}
                        </div>
                      )}

                      {msg.kind === "error" && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-red-500/15 text-red-400 shrink-0 mt-0.5">
                            <X size={12} weight="bold" />
                          </div>
                          <div>
                            <p className="text-xs font-mono font-semibold text-red-400">Something went wrong</p>
                            <p className="text-[11px] font-mono text-red-400/60 mt-0.5 leading-relaxed">{msg.error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom input bar — pinned */}
      <div className="w-full border-t border-white/[0.04] bg-gradient-to-t from-[#020208] to-[#020208]/80 backdrop-blur-sm pt-4 pb-6 px-4 sm:px-8 shrink-0">
        <div className="mx-auto max-w-2xl space-y-2.5">
          <PlaceholdersAndVanishInput
            placeholders={agentPlaceholders}
            value={input}
            onValueChange={setInput}
            onSubmit={(val) => sendCommand(val)}
            disabled={isSending}
          />
          <p className="text-center text-[10px] font-mono text-zinc-700">
            Noctra AI may produce inaccurate results. Always verify before confirming.
          </p>
        </div>
      </div>
    </div>
  );
}
