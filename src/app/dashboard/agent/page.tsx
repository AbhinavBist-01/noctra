"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkle,
  EnvelopeSimple,
  CalendarBlank,
  Lightning,
  Check,
  X,
  Warning,
  ClockCounterClockwise,
  PaperPlaneTilt,
  Star,
  Cpu,
  Trash,
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
/*  Helpers & Quick Suggestions                                        */
/* ------------------------------------------------------------------ */

const uid = () => crypto.randomUUID();

const quickNavButtons = [
  {
    id: "summarize",
    label: "Summarize Inbox",
    prompt: "Summarize my recent unread emails and highlight action items.",
    icon: <Sparkle size={13} className="text-amber-400" />,
  },
  {
    id: "meeting",
    label: "Schedule Meeting",
    prompt: "Schedule a sync meeting tomorrow at 3pm with team.",
    icon: <CalendarBlank size={13} className="text-blue-400" />,
  },
  {
    id: "reply",
    label: "Draft Quick Reply",
    prompt: "Draft a polite reply about being late for today's call.",
    icon: <Lightning size={13} className="text-violet-400" />,
  },
  {
    id: "important",
    label: "Check Priority",
    prompt: "Show important emails requiring my immediate decision.",
    icon: <Star size={13} className="text-emerald-400" />,
  },
];

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
/*  Minimal Action Card Component                                      */
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

  const typeLabel =
    action.type === "email_send"
      ? "Send Email"
      : action.type === "email_draft"
        ? "Draft Email"
        : "Calendar Invite";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-800 text-zinc-300">
            {email ? <EnvelopeSimple size={13} /> : <CalendarBlank size={13} />}
          </div>
          <span className="text-xs font-mono font-medium text-zinc-300">{typeLabel}</span>
        </div>
        {status === "confirmed" && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
            <Check size={10} /> Confirmed
          </span>
        )}
        {status === "cancelled" && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-md">
            <X size={10} /> Cancelled
          </span>
        )}
      </div>

      <div className="text-xs space-y-1.5 pt-1">
        {email && (
          <>
            <div className="text-zinc-400">
              <span className="text-zinc-600 font-mono mr-2">To:</span>
              {action.to.join(", ")}
            </div>
            <div className="text-zinc-200 font-medium">
              <span className="text-zinc-600 font-mono mr-2">Subject:</span>
              {action.subject}
            </div>
            <p className="text-zinc-400 line-clamp-3 text-[11px] leading-relaxed pt-1 border-t border-white/[0.04]">
              {action.body}
            </p>
          </>
        )}

        {calendar && (
          <>
            <div className="text-zinc-200 font-medium">{action.title}</div>
            <div className="text-zinc-400 text-[11px]">
              {formatTime(action.start)} → {formatTime(action.end)}
            </div>
          </>
        )}
      </div>

      {status === "pending" && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-950 hover:bg-white transition-all cursor-pointer"
          >
            <Check size={12} /> Confirm
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/[0.08] px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ResultCard({ result }: { result: CommandExecutionResult }) {
  const ok = result.status === "success";
  const label =
    result.type === "email_send"
      ? "Email sent"
      : result.type === "email_draft"
        ? "Draft saved"
        : "Event created";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-mono ${
        ok ? "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400" : "border-red-500/20 bg-red-500/[0.04] text-red-400"
      }`}
    >
      {ok ? <Check size={12} /> : <X size={12} />}
      <span>{label}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-zinc-500"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Minimal Agent Page                                            */
/* ------------------------------------------------------------------ */

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore existing history
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noctra_agent_conversations");
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save history
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem("noctra_agent_conversations", JSON.stringify(messages));
      }
    } catch {
      /* ignore */
    }
  }, [messages]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* Submit handler ------------------------------------------------- */
  const sendCommand = useCallback(
    async (textToSend: string) => {
      const text = textToSend.trim();
      if (!text || isSending) return;

      setIsSending(true);
      const userMsg: UserMessage = { id: uid(), role: "user", text };
      const loadingMsg: AgentLoadingMessage = { id: uid(), role: "agent", kind: "loading" };

      setMessages((m) => [...m, userMsg, loadingMsg]);
      setInput("");

      try {
        const historyForApi = messages
          .filter((m): m is UserMessage | AgentPreviewMessage => m.role === "user" || m.kind === "preview")
          .map((m) => {
            if (m.role === "user") return { role: "user" as const, content: m.text };
            return {
              role: "assistant" as const,
              content: `Prepared actions: ${m.actions.map((a) => a.type).join(", ")}`,
            };
          });

        const res = await apiFetch("/api/command/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: text, history: historyForApi }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }

        const json = (await res.json()) as {
          data: { actions: CommandPreviewAction[]; warnings: string[] };
        };

        const previewMsg: AgentPreviewMessage = {
          id: uid(),
          role: "agent",
          kind: "preview",
          actions: json.data.actions,
          warnings: json.data.warnings,
          status: "pending",
        };

        setMessages((m) => m.filter((msg) => msg.id !== loadingMsg.id).concat(previewMsg));
      } catch (err) {
        const errorMsg: AgentErrorMessage = {
          id: uid(),
          role: "agent",
          kind: "error",
          error: err instanceof Error ? err.message : "Parsing failed",
        };
        setMessages((m) => m.filter((msg) => msg.id !== loadingMsg.id).concat(errorMsg));
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages],
  );

  /* Confirm actions ------------------------------------------------ */
  const confirmActions = useCallback(
    async (previewId: string, actions: CommandPreviewAction[]) => {
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
          throw new Error(`Execution failed (HTTP ${res.status})`);
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
    },
    [],
  );

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
    <div className="relative flex flex-col h-full bg-[#08080a] text-zinc-100 font-sans">
      {/* Top Header — Minimalist */}
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#08080a] px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Cpu size={15} className="text-zinc-400" />
          <span className="text-xs font-mono font-medium text-zinc-300">Agent Command Panel</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              try {
                localStorage.removeItem("noctra_agent_conversations");
              } catch {
                /* ignore */
              }
            }}
            className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <Trash size={12} />
            Clear
          </button>
        )}
      </header>

      {/* Main Content / Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-xl space-y-5">
          {/* Empty State */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
              <h1 className="text-xl font-medium tracking-tight text-zinc-200">
                What would you like to automate?
              </h1>
              <p className="text-xs text-zinc-500 mt-1.5 max-w-sm">
                Issue natural language commands to search emails, draft replies, or manage calendar events.
              </p>

              {/* Minimal Suggestion Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-8 w-full max-w-md">
                {quickNavButtons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setInput(btn.prompt)}
                    className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-zinc-900/50 hover:bg-zinc-800/80 p-3 text-left transition-all cursor-pointer text-xs"
                  >
                    <div className="shrink-0">{btn.icon}</div>
                    <span className="text-zinc-300 font-medium text-[11px]">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* User Bubble */}
                {msg.role === "user" && (
                  <div className="max-w-[85%] rounded-lg bg-zinc-800 px-3.5 py-2.5 text-xs text-zinc-100">
                    {msg.text}
                  </div>
                )}

                {/* Agent Bubble */}
                {msg.role === "agent" && (
                  <div className="w-full max-w-[95%] space-y-2">
                    {msg.kind === "loading" && <TypingDots />}

                    {msg.kind === "preview" && (
                      <div className="space-y-2">
                        {msg.warnings.length > 0 && (
                          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                            <Warning size={14} />
                            <span>{msg.warnings.join(", ")}</span>
                          </div>
                        )}
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
                    )}

                    {msg.kind === "result" && (
                      <div className="space-y-1.5">
                        {msg.results.map((r) => (
                          <ResultCard key={r.actionId} result={r} />
                        ))}
                      </div>
                    )}

                    {msg.kind === "error" && (
                      <div className="text-xs font-mono text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                        {msg.error}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Minimal Bottom Command Bar */}
      <div className="p-4 border-t border-white/[0.06] bg-[#08080a] shrink-0">
        <div className="mx-auto max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendCommand(input);
            }}
            className="relative flex items-center rounded-lg border border-white/[0.1] bg-zinc-900/80 px-3 py-2 focus-within:border-zinc-500 transition-all"
          >
            <input
              type="text"
              placeholder="Type a command (e.g. Schedule meeting tomorrow at 2pm)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none px-1 font-sans"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-100 text-zinc-950 disabled:opacity-20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all shrink-0 cursor-pointer"
            >
              <PaperPlaneTilt size={13} weight="fill" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
