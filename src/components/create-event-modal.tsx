"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

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
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex w-[480px] flex-col rounded-2xl border border-white/[0.05] bg-zinc-950/95 shadow-2xl backdrop-blur-xl pointer-events-auto"
      >
        <div className="flex items-center justify-between border-b border-white/[0.04] px-4.5 py-3.5 bg-zinc-950/60">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-350">New Event</span>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-550 hover:bg-white/[0.03] hover:text-zinc-200 transition-colors cursor-pointer">
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="rounded-xl border border-white/[0.05] bg-[#020206]/85 px-3.5 py-2.5 text-xs font-mono text-zinc-250 outline-none placeholder:text-zinc-700 focus:border-amber-500/40 w-full"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-wider">Start</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-xl border border-white/[0.05] bg-[#020206]/85 px-3.5 py-2.5 text-xs font-mono text-zinc-250 outline-none focus:border-amber-500/40 [color-scheme:dark]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-wider">End</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-xl border border-white/[0.05] bg-[#020206]/85 px-3.5 py-2.5 text-xs font-mono text-zinc-250 outline-none focus:border-amber-500/40 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-mono font-bold uppercase text-zinc-500 tracking-wider">Attendees</label>
            <div className="flex gap-2">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttendee(); } }}
                placeholder="email@example.com"
                className="flex-1 rounded-xl border border-white/[0.05] bg-[#020206]/85 px-3.5 py-2.5 text-xs font-mono text-zinc-250 outline-none placeholder:text-zinc-700 focus:border-amber-500/40"
              />
              <button
                type="button"
                onClick={addAttendee}
                disabled={!emailInput.trim()}
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] px-4 py-2.5 text-xs font-mono font-bold text-zinc-300 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Add
              </button>
            </div>
            {attendees.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {attendees.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-mono font-bold text-amber-500"
                  >
                    {a.email}
                    <button type="button" onClick={() => removeAttendee(i)} className="text-amber-500 hover:text-amber-400 cursor-pointer">
                      <X size={10} weight="bold" />
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
            className="resize-none rounded-xl border border-white/[0.05] bg-[#020206]/85 px-3.5 py-2.5 text-xs font-mono text-zinc-250 outline-none placeholder:text-zinc-700 focus:border-amber-500/40"
          />
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.04] px-4.5 py-3.5 bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.06] bg-white/[0.01] hover:border-red-500/30 hover:bg-red-500/5 px-4.5 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-red-400 transition-all cursor-pointer"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !start || !end || attendees.length === 0 || creating}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-6 py-2.5 text-xs font-mono transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
          >
            {creating ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
