"use client";

import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
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
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], opts)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(date: Date, iso: string) {
  const d = new Date(iso);
  return date.toDateString() === d.toDateString();
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [preview, setPreview] = useState<CommandPreviewAction[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | undefined>();

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
      fetchEvents(weekStart);
    } catch {
      setError(`Could not connect to API at ${API}`);
    } finally {
      setExecuting(false);
    }
  }, [preview, fetchEvents, weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setWeekStart(d);
            }}
            className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            ← Prev
          </button>
          <h1 className="text-sm font-medium text-zinc-300">
            {formatWeekLabel(weekStart)}
          </h1>
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
              setWeekStart(d);
            }}
            className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            Next →
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => fetchEvents(weekStart)}
          disabled={loading}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-40"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full divide-x divide-zinc-800">
          {days.map((day, i) => {
            const dayEvents = events.filter((e) => isSameDay(day, e.start));
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={i} className="flex flex-1 flex-col">
                <div className={`border-b border-zinc-800 px-2 py-2 text-center ${isToday ? "bg-indigo-900/20" : ""}`}>
                  <div className="text-xs text-zinc-500">{DAYS[i]}</div>
                  <div className={`text-lg font-semibold ${isToday ? "text-indigo-400" : "text-zinc-300"}`}>
                    {day.getDate()}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-1">
                  {dayEvents.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-zinc-600">
                      No events
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="rounded-md bg-indigo-900/30 px-2 py-1.5 text-xs"
                        >
                          <div className="font-medium text-indigo-300">
                            {formatTime(evt.start)}
                          </div>
                          <div className="mt-0.5 text-zinc-200">{evt.title}</div>
                          {evt.attendees && evt.attendees.length > 0 && (
                            <div className="mt-0.5 truncate text-zinc-500">
                              {evt.attendees.map((a) => a.email).join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
