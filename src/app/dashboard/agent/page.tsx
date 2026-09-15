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
  PaperPlaneTilt,
  Star,
  Cpu,
  Trash,
  Plus,
  Copy,
  ChatCircleDots,
  Clock,
  ArrowUp,
  ArrowsClockwise,
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
  createdAt: string;
};

type AgentPreviewMessage = {
  id: string;
  role: "agent";
  kind: "preview";
  actions: CommandPreviewAction[];
  warnings: string[];
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
};

type AgentResultMessage = {
  id: string;
  role: "agent";
  kind: "result";
  results: CommandExecutionResult[];
  createdAt: string;
};

type AgentErrorMessage = {
  id: string;
  role: "agent";
  kind: "error";
  error: string;
  createdAt: string;
};

type AgentLoadingMessage = {
  id: string;
  role: "agent";
  kind: "loading";
  createdAt: string;
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

const quickSuggestions = [
  {
    id: "summarize",
    title: "Summarize Inbox",
    prompt: "Summarize my recent unread emails and highlight urgent action items.",
    icon: <Sparkle size={16} className="text-amber-400" />,
    badge: "Gmail",
  },
  {
    id: "meeting",
    title: "Schedule Team Sync",
    prompt: "Schedule a 30-minute sync meeting tomorrow at 3pm with team.",
    icon: <CalendarBlank size={16} className="text-blue-400" />,
    badge: "Calendar",
  },
  {
    id: "reply",
    title: "Draft Follow-up Reply",
    prompt: "Draft a polite reply to client saying I will send the finalized report by Friday.",
    icon: <Lightning size={16} className="text-violet-400" />,
    badge: "Draft",
  },
  {
    id: "priority",
    title: "Check Action Items",
    prompt: "Scan recent emails for pending decisions and blocker requests.",
    icon: <Star size={16} className="text-emerald-400" />,
    badge: "Intelligence",
  },
];

const followUpChips = [
  "Summarize last 5 emails",
  "Schedule standup tomorrow at 10 AM",
  "Draft reply confirming Friday meeting",
  "Show priority messages",
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
/*  Action Card Component                                              */
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
  const [copied, setCopied] = useState(false);
  const email = isEmail(action);
  const calendar = isCalendar(action);

  const typeLabel =
    action.type === "email_send"
      ? "Send Email"
      : action.type === "email_draft"
        ? "Draft Email"
        : "Calendar Invite";

  const copyContent = () => {
    if (email) {
      navigator.clipboard.writeText(`To: ${action.to.join(", ")}\nSubject: ${action.subject}\n\n${action.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 shadow-lg backdrop-blur-md space-y-3.5 transition-all hover:border-white/[0.14]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800/90 text-zinc-300 border border-white/[0.06]">
            {email ? (
              <EnvelopeSimple size={15} className="text-amber-400" />
            ) : (
              <CalendarBlank size={15} className="text-blue-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-zinc-200">{typeLabel}</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                {action.type.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {email && (
            <button
              onClick={copyContent}
              title="Copy details"
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          )}

          {status === "confirmed" && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
              <Check size={12} /> Confirmed
            </span>
          )}
          {status === "cancelled" && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-md">
              <X size={12} /> Cancelled
            </span>
          )}
          {status === "pending" && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              Pending Review
            </span>
          )}
        </div>
      </div>

      {/* Details Body */}
      <div className="text-xs space-y-2 rounded-lg bg-black/20 p-3 border border-white/[0.04]">
        {email && (
          <>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-zinc-500 font-mono text-[11px] w-12 shrink-0">To:</span>
              <div className="flex flex-wrap gap-1">
                {action.to.map((recipient, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300"
                  >
                    {recipient}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-zinc-200">
              <span className="text-zinc-500 font-mono text-[11px] w-12 shrink-0">Subject:</span>
              <span className="font-medium text-zinc-200 text-xs">{action.subject}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-white/[0.04]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                Message Body
              </span>
              <p className="text-zinc-300 text-[11px] leading-relaxed whitespace-pre-wrap font-sans">
                {action.body}
              </p>
            </div>
          </>
        )}

        {calendar && (
          <>
            <div className="flex items-center gap-2 text-zinc-200">
              <span className="text-zinc-500 font-mono text-[11px] w-14 shrink-0">Event:</span>
              <span className="font-medium text-zinc-200 text-xs">{action.title}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-zinc-500 font-mono text-[11px] w-14 shrink-0">Time:</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-300">
                <Clock size={12} className="text-zinc-500" />
                {formatTime(action.start)} → {formatTime(action.end)}
              </span>
            </div>
            {action.attendees && action.attendees.length > 0 && (
              <div className="flex items-center gap-2 text-zinc-400 pt-1">
                <span className="text-zinc-500 font-mono text-[11px] w-14 shrink-0">Invited:</span>
                <span className="text-[11px] text-zinc-300">
                  {action.attendees.map((a) => a.email).join(", ")}
                </span>
              </div>
            )}
            {action.description && (
              <p className="text-zinc-400 text-[11px] pt-1.5 mt-1 border-t border-white/[0.04]">
                {action.description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Action Trigger Buttons */}
      {status === "pending" && (
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            onClick={onCancel}
            className="rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            Discard
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 shadow-md shadow-amber-400/10 hover:bg-amber-300 transition-all cursor-pointer active:scale-95"
          >
            <Check size={13} weight="bold" /> Confirm & Execute
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
      ? "Email successfully dispatched"
      : result.type === "email_draft"
        ? "Draft created and saved to Gmail"
        : "Calendar event scheduled";

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-mono backdrop-blur-sm ${
        ok
          ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
          : "border-red-500/20 bg-red-500/[0.06] text-red-400"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center justify-center w-5 h-5 rounded-full ${
            ok ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {ok ? <Check size={11} weight="bold" /> : <X size={11} weight="bold" />}
        </div>
        <span>{label}</span>
      </div>
      {result.error && (
        <span className="text-[11px] text-red-400/80 truncate max-w-xs">{result.error}</span>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400 backdrop-blur-sm w-fit">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-amber-400"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <span className="text-[11px] font-mono text-zinc-400">
        Noctra is analyzing your request...
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Agent Chat Page                                               */
/* ------------------------------------------------------------------ */

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Adjust textarea height dynamically
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  /* Submit handler ------------------------------------------------- */
  const sendCommand = useCallback(
    async (textToSend: string) => {
      const text = textToSend.trim();
      if (!text || isSending) return;

      setIsSending(true);
      const timestamp = new Date().toISOString();
      const userMsg: UserMessage = { id: uid(), role: "user", text, createdAt: timestamp };
      const loadingMsg: AgentLoadingMessage = {
        id: uid(),
        role: "agent",
        kind: "loading",
        createdAt: timestamp,
      };

      setMessages((m) => [...m, userMsg, loadingMsg]);
      setInput("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

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
          warnings: json.data.warnings || [],
          status: "pending",
          createdAt: new Date().toISOString(),
        };

        setMessages((m) => m.filter((msg) => msg.id !== loadingMsg.id).concat(previewMsg));
      } catch (err) {
        const errorMsg: AgentErrorMessage = {
          id: uid(),
          role: "agent",
          kind: "error",
          error: err instanceof Error ? err.message : "Execution request failed",
          createdAt: new Date().toISOString(),
        };
        setMessages((m) => m.filter((msg) => msg.id !== loadingMsg.id).concat(errorMsg));
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages],
  );

  /* Key down for submitting with Enter without Shift */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendCommand(input);
    }
  };

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
      setMessages((m) => [
        ...m,
        { id: loadingId, role: "agent", kind: "loading", createdAt: new Date().toISOString() },
      ]);

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
          createdAt: new Date().toISOString(),
        };

        setMessages((m) => m.filter((msg) => msg.id !== loadingId).concat(resultMsg));
      } catch (err) {
        const errorMsg: AgentErrorMessage = {
          id: uid(),
          role: "agent",
          kind: "error",
          error: err instanceof Error ? err.message : "Execution failed",
          createdAt: new Date().toISOString(),
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

  const handleClearHistory = () => {
    setMessages([]);
    try {
      localStorage.removeItem("noctra_agent_conversations");
    } catch {
      /* ignore */
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex flex-col h-full bg-[#08080a] text-zinc-100 font-sans overflow-hidden">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/[0.07] via-amber-500/[0.02] to-transparent blur-3xl opacity-80" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#08080a]/80 backdrop-blur-md px-6 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Cpu size={16} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">Noctra Copilot</span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Live Agent
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={13} />
              New Chat
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* ========================================================= */}
        {/* Case 1: Empty State -> Chat option centered in the middle */}
        {/* ========================================================= */}
        {isEmpty ? (
          <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-8 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl flex flex-col items-center text-center space-y-6"
            >
              {/* Hero Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1 text-xs text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <Sparkle size={13} weight="fill" />
                <span className="font-mono text-[11px] font-medium tracking-wide">
                  Autonomous Email & Calendar Agent
                </span>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-100">
                  What would you like to accomplish?
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                  Draft emails, schedule calendar events, or summarize incoming threads with natural commands.
                </p>
              </div>

              {/* Centered Chat Input Box */}
              <div className="w-full">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendCommand(input);
                  }}
                  className="relative rounded-2xl border border-white/[0.12] bg-zinc-900/80 p-3 shadow-2xl backdrop-blur-xl transition-all focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20 hover:border-white/[0.18]"
                >
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    placeholder="Ask Noctra (e.g. Schedule sync meeting tomorrow at 3pm with Alex, or summarize unread emails)..."
                    className="w-full resize-none bg-transparent px-2 pt-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans leading-relaxed"
                  />

                  {/* Input Footer with Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] mt-1 px-1">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Lightning size={12} className="text-amber-400" />
                        <span>Gmail + Calendar Tools</span>
                      </span>
                      <span className="text-zinc-700">•</span>
                      <span className="hidden sm:inline">Press Enter to send</span>
                    </div>

                    <button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-400 text-zinc-950 disabled:opacity-20 disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-amber-300 transition-all cursor-pointer shadow-md shadow-amber-400/20"
                    >
                      <PaperPlaneTilt size={15} weight="fill" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="w-full pt-2">
                <div className="text-[11px] font-mono text-zinc-500 mb-3 uppercase tracking-wider text-left">
                  Suggested Prompts
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {quickSuggestions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setInput(item.prompt);
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                      className="group flex flex-col rounded-xl border border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-800/60 p-3.5 text-left transition-all hover:border-white/[0.12] hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-white/[0.04] border border-white/[0.05]">
                            {item.icon}
                          </div>
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* ========================================================= */
          /* Case 2: Active Chat Mode -> Messages + Sticky Bottom Bar  */
          /* ========================================================= */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Messages Scroll Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="mx-auto max-w-2xl sm:max-w-3xl space-y-6">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Agent Avatar */}
                      {msg.role === "agent" && (
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                          <Cpu size={15} weight="duotone" />
                        </div>
                      )}

                      {/* Content */}
                      <div
                        className={`${
                          msg.role === "user"
                            ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-800/90 border border-white/[0.08] px-4 py-3 text-sm text-zinc-100 shadow-sm leading-relaxed"
                            : "w-full max-w-[92%] space-y-3"
                        }`}
                      >
                        {/* User Message */}
                        {msg.role === "user" && <div className="whitespace-pre-wrap">{msg.text}</div>}

                        {/* Agent Message: Loading */}
                        {msg.role === "agent" && msg.kind === "loading" && <TypingDots />}

                        {/* Agent Message: Preview Actions */}
                        {msg.role === "agent" && msg.kind === "preview" && (
                          <div className="space-y-3">
                            <div className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
                              <Sparkle size={13} className="text-amber-400" />
                              <span>Here is the proposed execution plan:</span>
                            </div>

                            {msg.warnings.length > 0 && (
                              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                                <Warning size={15} className="shrink-0" />
                                <span>{msg.warnings.join(", ")}</span>
                              </div>
                            )}

                            <div className="space-y-2.5">
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
                          </div>
                        )}

                        {/* Agent Message: Results */}
                        {msg.role === "agent" && msg.kind === "result" && (
                          <div className="space-y-2">
                            <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                              <Check size={13} className="text-emerald-400" />
                              <span>Execution completed:</span>
                            </div>
                            {msg.results.map((r) => (
                              <ResultCard key={r.actionId} result={r} />
                            ))}
                          </div>
                        )}

                        {/* Agent Message: Errors */}
                        {msg.role === "agent" && msg.kind === "error" && (
                          <div className="flex items-center gap-2 text-xs font-mono text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            <Warning size={15} className="shrink-0" />
                            <span>{msg.error}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Docked Bottom Chat Bar in Active Mode */}
            <div className="p-4 border-t border-white/[0.06] bg-[#08080a]/90 backdrop-blur-lg shrink-0">
              <div className="mx-auto max-w-2xl sm:max-w-3xl space-y-2">
                {/* Follow-up Quick Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[11px] font-mono">
                  {followUpChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => void sendCommand(chip)}
                      disabled={isSending}
                      className="shrink-0 rounded-full border border-white/[0.06] bg-zinc-900/60 hover:bg-zinc-800 px-3 py-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendCommand(input);
                  }}
                  className="relative rounded-xl border border-white/[0.1] bg-zinc-900/90 p-2.5 shadow-xl transition-all focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20"
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    placeholder="Type a follow-up command or adjustment (Press Enter to send)..."
                    className="w-full resize-none bg-transparent px-2 pt-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1 px-1">
                    <span className="text-[10px] font-mono text-zinc-500">
                      Shift+Enter for newline
                    </span>
                    <button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400 text-zinc-950 disabled:opacity-20 disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-amber-300 transition-all cursor-pointer shadow-sm"
                    >
                      <PaperPlaneTilt size={13} weight="fill" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
