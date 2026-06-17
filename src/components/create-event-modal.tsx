"use client";

import { useState } from "react";

type Attendee = { email: string; name?: string };

type Props = {
  onCreate: (event: {
    title: string;
    description?: string;
    start: string;
    end: string;
    timezone?: string;
    attendees: Attendee[];
  }) => Promise<void>;
  onClose: () => void;
  creating: boolean;
  defaultStart?: string;
};

export function CreateEventModal({ onCreate, onClose, creating, defaultStart }: Props) {
  const now = new Date();
  const defaultDate = defaultStart ?? now.toISOString().slice(0, 16);
  const endDefault = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(defaultDate);
  const [end, setEnd] = useState(endDefault);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [emailInput, setEmailInput] = useState("");

  const addAttendee = () => {
    const email = emailInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAttendees([...attendees, { email }]);
      setEmailInput("");
    }
  };

  const removeAttendee = (idx: number) => {
    setAttendees(attendees.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !start || !end || attendees.length === 0) return;
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
      <div className="absolute inset-0" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex w-[480px] flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <span className="text-sm font-medium text-zinc-200">New Event</span>
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="rounded-lg border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-600"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Start</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-600 [color-scheme:dark]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-500">End</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-600 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Attendees</label>
            <div className="flex gap-2">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }}
                placeholder="email@example.com"
                className="flex-1 rounded-lg border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={addAttendee}
                disabled={!emailInput.trim()}
                className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {attendees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attendees.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-indigo-900/50 px-2.5 py-1 text-xs text-indigo-300"
                  >
                    {a.email}
                    <button type="button" onClick={() => removeAttendee(i)} className="text-indigo-400 hover:text-indigo-200">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="resize-none rounded-lg border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !start || !end || attendees.length === 0 || creating}
            className="rounded-lg bg-indigo-600 px-5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
          >
            {creating ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
