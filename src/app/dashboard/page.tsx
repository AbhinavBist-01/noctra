"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/server/lib/api-client";

type GmailMessage = {
  id: string;
  from?: string;
  subject?: string;
  snippet?: string;
  receivedAt?: string;
  priority?: "low" | "normal" | "high";
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function DashboardPage() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await apiFetch("/api/sync/setup", { method: "POST" });
      } catch {
        // sync may fail on first run; continue anyway
      }

      try {
        const [mailRes, calRes] = await Promise.all([
          apiFetch("/api/gmail/messages?limit=6"),
          apiFetch("/api/calendar/events"),
        ]);

        const mailJson = mailRes.ok ? await mailRes.json() : { data: [] };
        const calJson = calRes.ok ? await calRes.json() : { data: [] };

        setMessages(mailJson.data?.messages ?? mailJson.data ?? []);
        setEvents(calJson.data?.events ?? calJson.data ?? []);
      } catch {
        // network error — leave defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-200">Recent Emails</h2>
            <Link href="/dashboard/gmail" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">No emails yet. Connect your Gmail.</div>
            ) : (
              messages.slice(0, 5).map((msg) => (
                <Link
                  key={msg.id}
                  href="/dashboard/gmail"
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/30"
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${msg.priority === "high" ? "bg-red-500" : "bg-zinc-600"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-zinc-200">{msg.from ?? "Unknown"}</span>
                      <span className="shrink-0 text-xs text-zinc-500">{formatDate(msg.receivedAt)}</span>
                    </div>
                    <div className="truncate text-sm text-zinc-400">{msg.subject ?? "(no subject)"}</div>
                    <div className="line-clamp-1 text-xs text-zinc-500">{msg.snippet}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-200">Upcoming Events</h2>
            <Link href="/dashboard/calendar" className="text-xs text-indigo-400 hover:text-indigo-300">
              View all
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading...</div>
            ) : events.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">No upcoming events.</div>
            ) : (
              events.slice(0, 5).map((evt) => (
                <Link
                  key={evt.id}
                  href="/dashboard/calendar"
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-900/40">
                    <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-200">{evt.title}</div>
                    <div className="text-xs text-zinc-400">
                      {formatDate(evt.start)} · {formatTime(evt.start)} – {formatTime(evt.end)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
