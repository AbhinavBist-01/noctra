"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Robot,
  PaperPlaneTilt,
  EnvelopeSimple,
  CalendarBlank,
  Lightning,
  Check,
  X,
  Warning,
  ArrowRight,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { apiFetch } from "@/server/lib/api-client";
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
  { label: "Send an email", icon: <EnvelopeSimple size={13} weight="bold" /> },
  { label: "Schedule a meeting", icon: <CalendarBlank size={13} weight="bold" /> },
  { label: "Draft a reply", icon: <Lightning size={13} weight="bold" /> },
  { label: "Create a calendar event", icon: <CalendarBlank size={13} weight="bold" /> },
];

const msgVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.97 },
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

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
          {email ? (
            <EnvelopeSimple size={16} weight="duotone" className="text-amber-500" />
          ) : (
            <CalendarBlank size={16} weight="duotone" className="text-amber-500" />
          )}
        </div>
        <div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-600">
            {action.type === "email_send"
              ? "Send Email"
              : action.type === "email_draft"
                ? "Draft Email"
                : "Calendar Invite"}
          </span>
        </div>
      </div>

      {/* Details */}
      {email && (
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex gap-2">
            <span className="text-zinc-600 shrink-0">To:</span>
            <span className="text-zinc-300">{(action as EmailCommandAction).to.join(", ")}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-600 shrink-0">Subject:</span>
            <span className="text-zinc-300">{(action as EmailCommandAction).subject}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-600 shrink-0">Body:</span>
            <span className="text-zinc-400 line-clamp-3">{(action as EmailCommandAction).body}</span>
          </div>
        </div>
      )}

      {calendar && (
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex gap-2">
            <span className="text-zinc-600 shrink-0">Title:</span>
            <span className="text-zinc-300">{(action as CalendarInviteCommandAction).title}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-zinc-600 shrink-0">Time:</span>
            <span className="text-zinc-300">
              {formatTime((action as CalendarInviteCommandAction).start)} → {formatTime((action as CalendarInviteCommandAction).end)}
            </span>
          </div>
          {(action as CalendarInviteCommandAction).attendees.length > 0 && (
            <div className="flex gap-2">
              <span className="text-zinc-600 shrink-0">Attendees:</span>
              <span className="text-zinc-300">
                {(action as CalendarInviteCommandAction).attendees
                  .map((a) => a.name || a.email)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      {status === "pending" && (
        <div className="flex items-center gap-2 pt-1">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/20 px-3.5 py-1.5 text-[11px] font-mono font-bold text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer"
          >
            <Check size={13} weight="bold" />
            Confirm
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-[11px] font-mono font-bold text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1] transition-colors cursor-pointer"
          >
            <X size={13} weight="bold" />
            Cancel
          </motion.button>
        </div>
      )}
      {status === "confirmed" && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 pt-1">
          <Check size={13} weight="bold" />
          Confirmed — executing…
        </div>
      )}
      {status === "cancelled" && (
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-zinc-600 pt-1">
          <X size={13} weight="bold" />
          Cancelled
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result Card                                                        */
/* ------------------------------------------------------------------ */

function ResultCard({ result }: { result: CommandExecutionResult }) {
  const ok = result.status === "success";
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs font-mono ${
        ok
          ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
          : "border-red-500/20 bg-red-500/[0.06] text-red-400"
      }`}
    >
      {ok ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
      <span className="font-bold">
        {result.type === "email_send"
          ? "Email sent"
          : result.type === "email_draft"
            ? "Email drafted"
            : "Calendar invite created"}
      </span>
      {result.error && (
        <span className="text-red-500/70 ml-1">— {result.error}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typing Dots                                                        */
/* ------------------------------------------------------------------ */

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-amber-500/60"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          body: JSON.stringify({ command: text.trim() }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `Preview failed (${res.status})`);
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
    [isSending],
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

  /* Keyboard ------------------------------------------------------- */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCommand(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-[#020206] overflow-hidden">
      {/* Scrollable chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Empty state */}
          <AnimatePresence>
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center gap-5 pt-[15vh]"
              >
                <div className="relative">
                  <div className="absolute -inset-5 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
                  <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                    <Robot size={44} weight="duotone" className="text-amber-500" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-zinc-100 font-display">
                    What can I help you with?
                  </h1>
                  <p className="text-xs text-zinc-500 font-mono max-w-sm leading-relaxed">
                    Type a natural language command to send emails, schedule meetings, or automate tasks.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Online &amp; Ready
                  </span>
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
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                layout
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* User bubble */}
                {msg.role === "user" && (
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-amber-500/[0.12] border border-amber-500/20 px-4 py-2.5">
                    <p className="text-sm text-zinc-200 font-mono leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                )}

                {/* Agent messages */}
                {msg.role === "agent" && (
                  <div className="flex gap-3 max-w-[90%] w-full">
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <Robot size={15} weight="duotone" className="text-amber-500" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      {msg.kind === "loading" && <TypingDots />}

                      {msg.kind === "preview" && (
                        <>
                          {msg.warnings.length > 0 && (
                            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.06] px-3 py-2 text-xs font-mono text-yellow-400">
                              <Warning size={14} weight="bold" className="shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                {msg.warnings.map((w, i) => (
                                  <p key={i}>{w}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-zinc-400 font-mono">
                            I&apos;ve prepared {msg.actions.length} action{msg.actions.length !== 1 ? "s" : ""} for you:
                          </p>
                          <div className="space-y-2">
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
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-400 font-mono">
                            <Check size={13} weight="bold" className="inline mr-1 text-emerald-400" />
                            Execution complete:
                          </p>
                          {msg.results.map((r) => (
                            <ResultCard key={r.actionId} result={r} />
                          ))}
                        </div>
                      )}

                      {msg.kind === "error" && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5 text-xs font-mono text-red-400">
                          <X size={14} weight="bold" className="shrink-0 mt-0.5" />
                          <span>{msg.error}</span>
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

      {/* Bottom bar — pinned */}
      <div className="w-full bg-[#020206] border-t border-white/[0.03] pt-4 pb-6 px-4 sm:px-6 shrink-0">
        <div className="mx-auto max-w-2xl space-y-3">
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((s) => (
              <motion.button
                key={s.label}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setInput(s.label);
                  inputRef.current?.focus();
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-[11px] font-mono font-semibold text-zinc-500 hover:text-zinc-300 hover:border-amber-500/20 hover:bg-amber-500/[0.04] transition-colors cursor-pointer"
              >
                <span className="text-amber-500/50">{s.icon}</span>
                {s.label}
              </motion.button>
            ))}
          </div>

          {/* Input bar */}
          <motion.div
            animate={
              inputFocused
                ? {
                    boxShadow: "0 0 0 1px rgba(245,158,11,0.3), 0 0 24px -4px rgba(245,158,11,0.15)",
                  }
                : {
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 0 0 0px transparent",
                  }
            }
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3"
          >
            <ChatCircleDots
              size={18}
              weight="duotone"
              className={`shrink-0 transition-colors duration-200 ${inputFocused ? "text-amber-500" : "text-zinc-600"}`}
            />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command…"
              disabled={isSending}
              className="flex-1 bg-transparent text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => sendCommand(input)}
              disabled={!input.trim() || isSending}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500/25 transition-colors cursor-pointer"
            >
              <PaperPlaneTilt size={16} weight="fill" />
            </motion.button>
          </motion.div>

          <p className="text-center text-[10px] font-mono text-zinc-750">
            Noctra AI may produce inaccurate results. Verify important actions before confirming.
          </p>
        </div>
      </div>
    </div>
  );
}
