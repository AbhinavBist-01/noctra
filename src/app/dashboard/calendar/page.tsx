"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/server/lib/api-client";
import { CommandBar } from "@/components/command-bar";
import { PreviewModal } from "@/components/preview-modal";
import type { CommandPreviewAction } from "@/shared/command";

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
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

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

function getEventTop(iso: string) {
  const d = new Date(iso);
  const h = d.getHours() + d.getMinutes() / 60;
  return ((h - 7) / 12) * 100;
}

function getEventHeight(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const dur = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
  return (dur / 12) * 100;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [preview, setPreview] = useState<CommandPreviewAction[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async (start: Date) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/calendar/refresh", { method: "POST" });
      const weekEnd = getWeekEnd(start);
      const res = await apiFetch(
        `/api/calendar/events?weekStart=${start.toISOString()}&weekEnd=${weekEnd.toISOString()}`,
      );
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      setEvents(json.data?.events ?? json.data ?? []);
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(weekStart); }, [weekStart, fetchEvents]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 480;
    }
  }, []);

  const now = new Date();
  const todayTop = ((now.getHours() - 7 + now.getMinutes() / 60) / 12) * 100;

  const handleCommand = useCallback(async (command: string) => {
    setError(null);
    try {
      const res = await apiFetch("/api/command/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) { setError(`Server error: ${res.status}`); return; }
      const json = await res.json();
      const actions: CommandPreviewAction[] = json.data?.actions ?? [];
      if (actions.length > 0) setPreview(actions);
      else setError("Command parsed but no actions found");
    } catch { setError(`Could not connect to API at ${API}`); }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.length === 0) return;
    setExecuting(true); setError(null);
    try {
      const res = await apiFetch("/api/command/execute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: preview }),
      });
      if (!res.ok) { setError(`Execution failed: ${res.status}`); return; }
      setPreview(null); fetchEvents(weekStart);
    } catch { setError(`Could not connect to API at ${API}`); }
    finally { setExecuting(false); }
  }, [preview, fetchEvents, weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-2.5">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-medium text-zinc-100">{formatWeekLabel(weekStart)}</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-zinc-500">Syncing...</span>}
          <button
            onClick={() => fetchEvents(weekStart)}
            disabled={loading}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-40"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full">
          <div className="w-14 shrink-0 border-r border-zinc-800 pt-[52px]">
            {HOURS.map((h) => (
              <div key={h} className="relative h-[calc(100%/12)]" style={{ height: `${100 / 12}%`, minHeight: "48px" }}>
                <span className="absolute -top-2.5 right-2 text-[11px] text-zinc-500">
                  {formatHour(h)}
                </span>
              </div>
            ))}
          </div>

          <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
            <div className="flex w-full divide-x divide-zinc-800">
              {days.map((day, i) => {
                const dayEvents = events.filter((e) => isSameDay(day, e.start));
                const isToday = day.toDateString() === now.toDateString();
                return (
                  <div key={i} className="relative flex flex-1 flex-col">
                    <div className={`sticky top-0 z-10 border-b border-zinc-800 px-1 py-2 text-center ${isToday ? "" : "bg-zinc-950"}`}>
                      <div className="text-[11px] font-medium text-zinc-500">{DAYS[i]}</div>
                      <div className={`mt-0.5 text-lg font-semibold ${isToday ? "mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white" : "text-zinc-300"}`}>
                        {day.getDate()}
                      </div>
                    </div>

                    <div className="relative flex-1" style={{ minHeight: `${12 * 48}px` }}>
                      <div className="absolute inset-0">
                        {HOURS.map((h) => (
                          <div key={h} className="border-b border-zinc-800/50" style={{ height: "48px" }} />
                        ))}
                      </div>

                      {isToday && (
                        <div
                          className="absolute left-0 right-0 z-10 border-t-2 border-red-500"
                          style={{ top: `${todayTop}%` }}
                        >
                          <div className="-mt-1.5 ml-0.5 h-3 w-3 rounded-full bg-red-500" />
                        </div>
                      )}

                      {dayEvents.map((evt) => {
                        const top = getEventTop(evt.start);
                        const height = getEventHeight(evt.start, evt.end);
                        return (
                          <div
                            key={evt.id}
                            className="absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-md bg-indigo-900/60 px-1.5 py-1 text-xs"
                            style={{ top: `${top}%`, height: `${Math.max(height, 1.5)}%` }}
                          >
                            <div className="truncate font-medium text-indigo-200">
                              {evt.title}
                            </div>
                            {height > 2.5 && (
                              <div className="truncate text-indigo-300/70">
                                {formatTime(evt.start)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
