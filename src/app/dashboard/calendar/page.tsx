"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "@/server/lib/api-client";
import { CommandBar } from "@/components/command-bar";
import { PreviewModal } from "@/components/preview-modal";
import { CreateEventModal } from "@/components/create-event-modal";
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
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 48;

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
  return Math.max((e - s) / (1000 * 60 * 60) * HOUR_HEIGHT, 4);
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [preview, setPreview] = useState<CommandPreviewAction[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async (start: Date) => {
    setLoading(true);
    setError(null);
    try {
      const refreshRes = await apiFetch("/api/calendar/refresh", { method: "POST" });
      if (!refreshRes.ok) {
        const refreshJson = await refreshRes.json().catch(() => null);
        setError(refreshJson?.error?.message ?? `Refresh failed: ${refreshRes.status}`);
        return;
      }
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
      setError(`Could not connect to API at ${API}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(weekStart); }, [weekStart, fetchEvents]);

  const hasScrolled = useRef(false);
  useEffect(() => {
    if (scrollRef.current && !hasScrolled.current) {
      const now = new Date();
      const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, nowTop - 200);
      hasScrolled.current = true;
    }
  }, []);

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;

  const handleCommand = useCallback(async (command: string) => {
    setError(null);
    try {
      const res = await apiFetch("/api/command/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Server error: ${res.status}`);
        return;
      }
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
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? `Execution failed: ${res.status}`);
        return;
      }
      setPreview(null); fetchEvents(weekStart);
    } catch { setError(`Could not connect to API at ${API}`); }
    finally { setExecuting(false); }
  }, [preview, fetchEvents, weekStart]);

  const handleCreate = useCallback(async (event: {
    title: string; description?: string; start: string; end: string; timezone?: string; attendees: { email: string; name?: string }[];
  }) => {
    setCreating(true); setError(null);
    try {
      const res = await apiFetch("/api/calendar/invites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!res.ok) { setError(`Failed to create event: ${res.status}`); return; }
      setShowCreate(false); fetchEvents(weekStart);
    } catch { setError(`Could not connect to API at ${API}`); }
    finally { setCreating(false); }
  }, [fetchEvents, weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Today
          </button>
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
          <h1 className="text-base font-medium text-zinc-100">{formatWeekLabel(weekStart)}</h1>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-400" />
              Syncing...
            </span>
          )}
          <button
            onClick={() => fetchEvents(weekStart)}
            disabled={loading}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-40"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            + Create
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
          <div className="flex min-w-0">
            {/* Time gutter */}
            <div className="sticky left-0 z-10 w-14 shrink-0 bg-zinc-950">
              <div className="h-[42px]" />
              {HOURS.map((h) => (
                <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                  <span className="absolute -top-2.5 right-2 text-[11px] leading-none text-zinc-500">
                    {formatHour(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, i) => {
              const dayEvents = events.filter((e) => isSameDay(day, e.start));
              const isToday = day.toDateString() === now.toDateString();
              return (
                <div key={i} className="relative flex flex-1 flex-col">
                  {/* Sticky day header */}
                  <div
                    className={`sticky top-0 z-10 border-b border-zinc-700/60 ${
                      isToday ? "bg-zinc-900" : "bg-zinc-950"
                    } px-1 py-1.5 text-center`}
                    style={{ height: "42px" }}
                  >
                    <div className="text-[11px] font-medium leading-tight text-zinc-500">
                      {DAYS[i]}
                    </div>
                    <div
                      className={`mt-px text-sm font-semibold leading-tight ${
                        isToday
                          ? "mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white"
                          : "text-zinc-300"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>

                  {/* Grid body */}
                  <div className="relative flex-1">
                    <div className="pointer-events-none">
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="border-b border-zinc-800/30"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        />
                      ))}
                    </div>

                    <div className="absolute inset-0">
                      {/* Current time line */}
                      {isToday && nowTop >= 0 && nowTop <= 24 * HOUR_HEIGHT && (
                        <div
                          className="absolute left-0 right-0 z-20"
                          style={{ top: `${nowTop}px` }}
                        >
                          <div className="flex items-center">
                            <div className="h-2 w-2 -translate-x-0.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                            <div className="flex-1 border-t border-red-500" />
                          </div>
                        </div>
                      )}

                      {/* Events */}
                      {dayEvents.map((evt) => {
                        const top = getEventTopPx(evt.start);
                        const height = getEventHeightPx(evt.start, evt.end);
                        return (
                          <div
                            key={evt.id}
                            className="absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-md border border-indigo-700/30 bg-indigo-900/70 px-1.5 py-1 text-xs shadow-sm transition-all hover:z-20 hover:border-indigo-500/60 hover:bg-indigo-800/80 hover:shadow-md"
                            style={{ top: `${top}px`, height: `${Math.max(height, 4)}px` }}
                          >
                            <div className="truncate font-medium leading-tight text-indigo-100">
                              {evt.title}
                            </div>
                            {height >= 20 && (
                              <div className="mt-0.5 truncate text-[10px] leading-tight text-indigo-300/70">
                                {formatTime(evt.start)} – {formatTime(evt.end)}
                              </div>
                            )}
                            {height >= 32 && evt.attendees && evt.attendees.length > 0 && (
                              <div className="truncate text-[10px] leading-tight text-indigo-300/50">
                                {evt.attendees.length} attendee{evt.attendees.length !== 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateEventModal
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
          creating={creating}
        />
      )}

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
