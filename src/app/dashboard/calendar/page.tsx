"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/server/lib/api-client";
import { PreviewModal } from "@/components/preview-modal";
import { CreateEventModal } from "@/components/create-event-modal";
import type { CommandPreviewAction } from "@/shared/command";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarBlank,
  Clock,
  Sparkle,
  ArrowClockwise,
  Plus,
  CaretLeft,
  CaretRight,
  User,
  Check,
  X,
  Warning
} from "@phosphor-icons/react";

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  attendees?: { email: string; name?: string }[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 56; // taller slots for premium look

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(weekStart: Date) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatWeekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  if (start.getMonth() !== end.getMonth()) {
    return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], opts)}`;
  }
  return `${start.toLocaleDateString([], opts)} – ${end.getDate()}, ${end.getFullYear()}`;
}

function formatHour(h: number) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(date: Date, iso: string) {
  const d = new Date(iso);
  return date.toDateString() === d.toDateString();
}

function getEventTopPx(iso: string) {
  const d = new Date(iso);
  return (d.getHours() + d.getMinutes() / 60) * HOUR_HEIGHT;
}

function getEventHeightPx(startIso: string, endIso: string) {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  return Math.max((e - s) / (1000 * 60 * 60) * HOUR_HEIGHT, 15);
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [preview, setPreview] = useState<CommandPreviewAction[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // AI Assistant input in right drawer
  const [aiInput, setAiInput] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  // Mock mini month calendar visual helper
  const [miniMonthDays, setMiniMonthDays] = useState<Date[]>([]);
  
  useEffect(() => {
    // Generate mini calendar days based on current weekStart
    const daysArr: Date[] = [];
    const firstDay = new Date(weekStart);
    // Rewind back to Sunday or previous month start to fill grid
    firstDay.setDate(firstDay.getDate() - 3);
    for (let i = 0; i < 28; i++) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() + i);
      daysArr.push(d);
    }
    setMiniMonthDays(daysArr);
  }, [weekStart]);

  const fetchEvents = useCallback(async (start: Date) => {
    setLoading(true);
    setError(null);
    try {
      const weekEnd = getWeekEnd(start);
      const res = await apiFetch(
        `/api/calendar/events?weekStart=${start.toISOString()}&weekEnd=${weekEnd.toISOString()}`,
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Server error: ${res.status}`);
        return;
      }
      const json = await res.json();
      setEvents(json.data?.events ?? json.data ?? []);
    } catch {
      setError("Failed to sync calendar events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(weekStart); }, [weekStart, fetchEvents]);

  const hasScrolled = useRef(false);
  useEffect(() => {
    const n = new Date();
    setNow(n);
    if (scrollRef.current && !hasScrolled.current) {
      const nowTop = (n.getHours() + n.getMinutes() / 60) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, nowTop - 150);
      hasScrolled.current = true;
    }
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const nowTop = now ? (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT : 0;

  const handleCreate = useCallback(async (event: {
    title: string; description?: string; start: string; end: string; timezone?: string; attendees: { email: string; name?: string }[];
  }) => {
    setCreating(true); setError(null);
    try {
      const res = await apiFetch("/api/calendar/invites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg = json?.error?.message ?? `Failed to create event (${res.status})`;
        setError(msg);
        return;
      }
      setShowCreate(false); fetchEvents(weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite – check server logs");
    }
    finally { setCreating(false); }
  }, [fetchEvents, weekStart]);


  const handleAiCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAiError(null);
    setAiSuccess(null);
    try {
      const res = await apiFetch("/api/command/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: aiInput.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setAiError(json?.error?.message ?? `AI scheduling failed: ${res.status}`);
        return;
      }
      const json = await res.json();
      const actions: CommandPreviewAction[] = json.data?.actions ?? [];
      const calAction = actions.find((a) => a.type === "calendar_invite");
      if (calAction) {
        setPreview(actions);
        setAiInput("");
      } else {
        setAiError("Command parsed but no calendar actions found. Try typing 'Schedule a meeting with...'");
      }
    } catch {
      setAiError("Connection to AI engine failed.");
    }
  };

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.length === 0) return;
    setExecuting(true); setError(null);
    try {
      const res = await apiFetch("/api/command/execute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: preview }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setAiError(json?.error?.message ?? `Execution failed: ${res.status}`);
        return;
      }
      setPreview(null);
      setAiSuccess("AI successfully scheduled your event!");
      fetchEvents(weekStart);
    } catch { setAiError("Could not schedule event."); }
    finally { setExecuting(false); }
  }, [preview, fetchEvents, weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const suggestions = [
    "Invite team@example.com to sync meeting tomorrow at 10am",
    "Schedule dentist appointment next Monday at 2pm",
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
      
      {/* Top Google-style Calendar Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/[0.04] bg-[#020206]/85 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] px-4 py-2 text-xs font-mono font-bold text-zinc-350 transition-colors shadow-sm cursor-pointer"
          >
            Today
          </button>
          
          <div className="flex items-center rounded-xl border border-white/[0.06] bg-white/[0.01] p-0.5">
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
              className="rounded-lg p-2 text-zinc-455 hover:bg-white/[0.04] hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
              className="rounded-lg p-2 text-zinc-455 hover:bg-white/[0.04] hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
          
          <h1 className="font-display text-base font-extrabold text-zinc-200">{formatWeekLabel(weekStart)}</h1>
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <span className="flex items-center gap-2 text-[11px] font-mono text-zinc-550">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-850 border-t-amber-500" />
              Syncing...
            </span>
          )}
          <button
            onClick={() => fetchEvents(weekStart)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 shadow-sm cursor-pointer hover:border-white/[0.12]"
          >
            <ArrowClockwise className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-mono font-bold text-zinc-950 shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            + ADD EVENT
          </button>
        </div>
      </div>

      {error && (
        <div className="relative z-10 mx-6 mt-3 rounded-xl border border-red-950 bg-red-950/20 px-4 py-2.5 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Main Grid: Three-Panel Layout */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* Left Google-style Sidebar Pane */}
        <div className="flex w-64 shrink-0 flex-col border-r border-white/[0.04] bg-zinc-950/20 backdrop-blur-md p-4 gap-6">
          
          {/* Mini Month Grid Visual */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">June 2026</span>
            <div className="grid grid-cols-7 gap-y-2.5 text-center text-[9px] text-zinc-500 font-mono font-bold uppercase">
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
              
              {miniMonthDays.map((d, idx) => {
                const isCurrentWeek = days.some((curr) => curr.toDateString() === d.toDateString());
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <span
                    key={idx}
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-center font-mono ${
                      isToday
                        ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20"
                        : isCurrentWeek
                        ? "bg-white/[0.03] border border-white/[0.05] text-zinc-200 font-bold"
                        : "text-zinc-650"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                );
              })}
            </div>
          </div>

          {/* List of Calendars Checkbox */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">My Calendars</span>
            <div className="space-y-3.5">
              <label className="flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-zinc-200 select-none">
                <input type="checkbox" defaultChecked className="accent-amber-500 h-3.5 w-3.5 rounded border-white/[0.06] bg-[#020206] transition-all cursor-pointer" />
                <span>Primary Calendar</span>
              </label>
              <label className="flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-zinc-200 select-none">
                <input type="checkbox" defaultChecked className="accent-emerald-500 h-3.5 w-3.5 rounded border-white/[0.06] bg-[#020206] transition-all cursor-pointer" />
                <span>Sync Tasks</span>
              </label>
              <label className="flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-zinc-200 select-none">
                <input type="checkbox" className="accent-amber-500 h-3.5 w-3.5 rounded border-white/[0.06] bg-[#020206] transition-all cursor-pointer" />
                <span>Birthdays</span>
              </label>
            </div>
          </div>
        </div>

        {/* Center Panel: Large Weekly hourly Calendar Grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-950/10 backdrop-blur-sm">
          <div className="flex min-w-[700px]">
            
            {/* Hour Timeline Gutter */}
            <div className="sticky left-0 z-20 w-14 shrink-0 bg-[#020206] border-r border-white/[0.04]">
              <div className="h-12 border-b border-white/[0.04]" />
              {HOURS.map((h) => (
                <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                  <span className="absolute -top-2 right-2.5 text-[9px] font-mono font-bold text-zinc-650">
                    {formatHour(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day, i) => {
              const dayEvents = events.filter((e) => isSameDay(day, e.start));
              const isToday = now ? day.toDateString() === now.toDateString() : false;
              return (
                <div key={i} className="relative flex flex-1 flex-col border-r border-white/[0.03]">
                  
                  {/* Sticky Day Column Header */}
                  <div
                    className={`sticky top-0 z-10 border-b border-white/[0.04] flex flex-col justify-center items-center py-2 ${
                      isToday ? "bg-white/[0.02] backdrop-blur-md" : "bg-[#020206]/90 backdrop-blur-md"
                    }`}
                    style={{ height: "48px" }}
                  >
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">{DAYS[i]}</span>
                    <span className={`mt-0.5 text-xs font-semibold flex h-6 w-6 items-center justify-center rounded-lg ${
                      isToday ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20" : "text-zinc-300"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Hour slots background grid lines */}
                  <div className="relative flex-1">
                    <div className="pointer-events-none">
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="border-b border-white/[0.03]"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        />
                      ))}
                    </div>

                    {/* Timeline elements container */}
                    <div className="absolute inset-0">
                      
                      {/* Current live time indicator marker */}
                      {isToday && nowTop >= 0 && nowTop <= 24 * HOUR_HEIGHT && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: `${nowTop}px` }}
                        >
                          <div className="flex items-center">
                            <div className="h-2 w-2 -translate-x-[5px] rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                            <div className="flex-1 border-t-2 border-amber-500/80" />
                          </div>
                        </div>
                      )}

                      {/* Render Events */}
                      {dayEvents.map((evt) => {
                        const top = getEventTopPx(evt.start);
                        const height = getEventHeightPx(evt.start, evt.end);
                        return (
                          <motion.div
                            key={evt.id}
                            whileHover={{ scale: 1.01, zIndex: 30 }}
                            className="absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10 p-2 text-xs shadow-md transition-all hover:z-20 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer border-l-2"
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="truncate font-semibold text-zinc-100 leading-tight">
                              {evt.title}
                            </div>
                            {height >= 24 && (
                              <div className="mt-0.5 truncate text-[10px] font-mono font-bold text-amber-500/70">
                                {formatTime(evt.start)} – {formatTime(evt.end)}
                              </div>
                            )}
                            {height >= 45 && evt.description && (
                              <div className="mt-1 text-[10px] text-zinc-500 line-clamp-1 leading-normal font-mono">
                                {evt.description}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Noctra AI Booking Assistant Panel */}
        <div className="flex w-72 shrink-0 flex-col border-l border-white/[0.04] bg-zinc-950/20 backdrop-blur-md p-4 gap-4">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-3">
            <Sparkle size={14} weight="fill" className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-200">AI Booking Assistant</span>
          </div>

          <form onSubmit={handleAiCommandSubmit} className="flex flex-col gap-2.5">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Tell AI to schedule an event... (e.g., 'Schedule a 1hr project sync with tom@example.com tomorrow at 10 AM')"
              rows={4}
              className="resize-none rounded-xl border border-white/[0.05] bg-[#020206]/85 p-3.5 text-xs text-zinc-100 placeholder-zinc-700 outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 leading-normal font-mono"
            />
            <button
              type="submit"
              disabled={!aiInput.trim()}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-xs font-mono font-bold text-zinc-950 transition-all active:scale-95 disabled:opacity-45 disabled:pointer-events-none shadow-md shadow-amber-500/10 cursor-pointer"
            >
              Parse Command
            </button>
          </form>

          {aiError && (
            <div className="text-xs text-red-400 bg-red-950/10 border border-red-950/20 rounded-xl p-3 font-mono">{aiError}</div>
          )}

          {aiSuccess && (
            <div className="text-xs text-emerald-450 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 font-mono">{aiSuccess}</div>
          )}

          {/* Interactive AI Prompt suggestions */}
          <div className="flex flex-col gap-2.5 mt-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-550">Prompt Suggestions</span>
            <div className="space-y-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiInput(s)}
                  className="w-full text-left rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-amber-500/20 hover:bg-amber-500/5 p-3 text-[10px] font-mono text-zinc-400 hover:text-amber-500 leading-normal transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Create Event Modal */}
      {showCreate && (
        <CreateEventModal
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
          creating={creating}
        />
      )}

      {/* AI Preview Action confirmation Modal */}
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
