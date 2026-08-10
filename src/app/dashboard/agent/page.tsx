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
  Plus,
  PaperPlaneTilt,
  CaretDown,
  Star,
  ArrowsClockwise,
  Globe,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { apiFetch } from "@/server/lib/api-client";
import { AmbientParticles } from "@/components/ui/ambient-particles";
import { FormattedMessageText } from "@/components/ui/formatted-message-text";
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
/*  Helpers & Quick Nav Config                                         */
/* ------------------------------------------------------------------ */

const uid = () => crypto.randomUUID();

const quickNavButtons = [
  {
    id: "summarize",
    label: "Summarize Inbox",
    prompt: "Summarize my recent unread emails and highlight action items.",
    icon: <Sparkle size={14} weight="fill" className="text-amber-400" />,
  },
  {
    id: "meeting",
    label: "Schedule Meeting",
    prompt: "Schedule a sync meeting tomorrow at 3pm with team.",
    icon: <CalendarBlank size={14} weight="duotone" className="text-blue-400" />,
  },
  {
    id: "reply",
    label: "Draft Quick Reply",
    prompt: "Draft a polite reply about being late for today's call.",
    icon: <Lightning size={14} weight="fill" className="text-violet-400" />,
  },
  {
    id: "important",
    label: "Check Priority",
    prompt: "Show important emails requiring my immediate decision.",
    icon: <Star size={14} weight="fill" className="text-emerald-400" />,
  },
];

const msgVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
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

  const typeLabel =
    action.type === "email_send"
      ? "Send Email"
      : action.type === "email_draft"
        ? "Draft Email"
        : "Calendar Invite";

  const accentColor = isEmail_
    ? {
        ring: "ring-amber-500/20",
        glow: "bg-amber-500/[0.03]",
        icon: "bg-amber-500/10 text-amber-400",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      }
    : {
        ring: "ring-blue-500/20",
        glow: "bg-blue-500/[0.03]",
        icon: "bg-blue-500/10 text-blue-400",
        badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border border-white/[0.08] ${accentColor.glow} ring-1 ${accentColor.ring} overflow-hidden`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-px ${
          isEmail_
            ? "bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
            : "bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
        }`}
      />

      <div className="p-4.5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-8 h-8 rounded-xl ${accentColor.icon}`}>
              {email ? (
                <EnvelopeSimple size={16} weight="duotone" />
              ) : (
                <CalendarBlank size={16} weight="duotone" />
              )}
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${accentColor.badge}`}>
              {typeLabel}
            </span>
          </div>
          {status === "confirmed" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <Check size={10} weight="bold" /> Confirmed
            </span>
          )}
          {status === "cancelled" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-500 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full">
              <X size={10} weight="bold" /> Cancelled
            </span>
          )}
        </div>

        <div className="h-px bg-white/[0.04]" />

        {email && (
          <div className="space-y-2">
            <DetailRow label="To" value={(action).to.join(", ")} />
            <DetailRow label="Subject" value={(action).subject} highlight />
            <div className="flex gap-3">
              <span className="text-[11px] font-mono text-zinc-500 shrink-0 mt-0.5 w-14">Body</span>
              <p className="text-[12px] text-zinc-300 leading-relaxed font-sans line-clamp-4">
                {(action).body}
              </p>
            </div>
          </div>
        )}

        {calendar && (
          <div className="space-y-2">
            <DetailRow label="Title" value={(action).title} highlight />
            <DetailRow
              label="Time"
              value={`${formatTime((action).start)} → ${formatTime((action).end)}`}
            />
            {(action).attendees.length > 0 && (
              <DetailRow
                label="Guests"
                value={(action).attendees.map((a) => a.name || a.email).join(", ")}
              />
            )}
          </div>
        )}

        {status === "pending" && (
          <div className="flex items-center gap-2.5 pt-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-1.5 text-xs font-mono font-bold text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm"
            >
              <Check size={12} weight="bold" /> Confirm Action
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-mono font-medium text-zinc-400 hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              Cancel
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
      <span className="text-[11px] font-mono text-zinc-500 shrink-0 mt-0.5 w-14">{label}</span>
      <span className={`text-[12px] font-mono leading-relaxed ${highlight ? "text-zinc-100 font-semibold" : "text-zinc-300"}`}>
        {value}
      </span>
    </div>
  );
}

function ResultCard({ result }: { result: CommandExecutionResult }) {
  const ok = result.status === "success";
  const label =
    result.type === "email_send"
      ? "Email sent successfully"
      : result.type === "email_draft"
        ? "Email saved to drafts"
        : "Calendar event created";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        ok ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-red-500/20 bg-red-500/[0.06]"
      }`}
    >
      <div className={`flex items-center justify-center w-6 h-6 rounded-lg shrink-0 ${ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
        {ok ? <Check size={12} weight="bold" /> : <X size={12} weight="bold" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-mono font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}>
          {label}
        </p>
        {result.error && (
          <p className="text-[11px] text-red-400/80 font-mono mt-0.5 truncate">{result.error}</p>
        )}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-2 h-2 rounded-full bg-amber-400/60"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ChatGPT-Inspired Minimalist Agent Page                        */
/* ------------------------------------------------------------------ */

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<"chat" | "work">("chat");
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
    <div className="relative flex flex-col h-full bg-[#050508] text-zinc-100 font-sans overflow-hidden">
      <AmbientParticles className="opacity-15 pointer-events-none" />

      {/* Top Header Bar — ChatGPT Inspired */}
      <header className="relative z-20 flex items-center justify-between border-b border-white/[0.04] bg-[#050508]/80 px-6 py-3.5 backdrop-blur-xl">
        {/* Left: Brand/Model Dropdown */}
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <span className="font-display font-extrabold text-sm text-zinc-100 tracking-tight">Noctra Agent</span>
          <CaretDown size={14} className="text-zinc-500" />
        </div>

        {/* Center: Mode Pill Selector (Chat | Work) */}
        <div className="flex items-center rounded-full border border-white/[0.08] bg-zinc-900/60 p-1 shadow-inner">
          <button
            onClick={() => setMode("chat")}
            className={`rounded-full px-4 py-1 text-xs font-semibold transition-all cursor-pointer ${
              mode === "chat" ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setMode("work")}
            className={`flex items-center gap-1 rounded-full px-4 py-1 text-xs font-semibold transition-all cursor-pointer ${
              mode === "work" ? "bg-zinc-800 text-zinc-100 shadow-md" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkle size={12} className="text-amber-400" /> Work
          </button>
        </div>

        {/* Right: Actions / Clear */}
        <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all cursor-pointer"
            >
              <ClockCounterClockwise size={13} />
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Main Chat Scroll Container */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 scroll-smooth">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Empty Minimalist State — ChatGPT Inspired */}
          <AnimatePresence>
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center gap-6 pt-[20vh] pb-10 text-center"
              >
                <h1 className="text-3xl font-normal tracking-tight text-zinc-100 font-display">
                  Ready when you are.
                </h1>

                {/* Subtle Floating Capsule Bar Prompt Placeholder */}
                <p className="text-xs text-zinc-500 font-mono tracking-wide max-w-xs leading-relaxed">
                  Type a command or choose a quick action below to run automated Gmail & Calendar tasks.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation History */}
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
                {/* User Message Bubble */}
                {msg.role === "user" && (
                  <div className="max-w-[80%] rounded-2xl bg-zinc-800/90 border border-white/[0.08] px-4.5 py-3 shadow-md">
                    <p className="text-sm text-zinc-100 leading-relaxed font-sans">{msg.text}</p>
                  </div>
                )}

                {/* Agent Response Area */}
                {msg.role === "agent" && (
                  <div className="flex gap-3 max-w-[95%] w-full">
                    {/* Avatar Icon */}
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-amber-400">
                        <Robot size={15} weight="bold" />
                      </div>
                    </div>

                    {/* Content Body */}
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
                            Prepared {msg.actions.length} action{msg.actions.length !== 1 ? "s" : ""}:
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
                            <p className="text-[11px] font-mono text-red-400/70 mt-0.5 leading-relaxed">{msg.error}</p>
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

      {/* Floating Capsule Input Area — ChatGPT Inspired */}
      <div className="w-full border-t border-white/[0.03] bg-gradient-to-t from-[#050508] via-[#050508]/90 to-transparent pt-3 pb-6 px-4 sm:px-8 shrink-0">
        <div className="mx-auto max-w-2xl space-y-3.5">
          {/* Subtle Quick Navigation Pills */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 no-scrollbar">
            {quickNavButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  setInput(btn.prompt);
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-zinc-900/80 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-all cursor-pointer shrink-0 shadow-sm hover:scale-[1.02]"
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* ChatGPT Style Floating Capsule Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendCommand(input);
            }}
            className="relative flex items-center rounded-full border border-white/[0.1] bg-zinc-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl focus-within:border-white/[0.2] transition-all"
          >
            {/* Plus Icon */}
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors shrink-0 mr-1"
            >
              <Plus size={18} />
            </button>

            {/* Input field */}
            <input
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none px-2 font-sans"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-950 disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all shrink-0 cursor-pointer"
            >
              <PaperPlaneTilt size={14} weight="fill" />
            </button>
          </form>

          <p className="text-center text-[10px] text-zinc-600 font-mono">
            Noctra Agent handles emails & calendar invites securely via Corsair.
          </p>
        </div>
      </div>
    </div>
  );
}
