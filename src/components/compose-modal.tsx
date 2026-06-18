"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

type Props = {
  onSend: (msg: { to: string; subject: string; body: string }) => Promise<void>;
  onClose: () => void;
  sending: boolean;
  defaults?: { to?: string; subject?: string; body?: string };
};

export function ComposeModal({ onSend, onClose, sending, defaults }: Props) {
  const [to, setTo] = useState(defaults?.to ?? "");
  const [subject, setSubject] = useState(defaults?.subject ?? "");
  const [body, setBody] = useState(defaults?.body ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim()) return;
    await onSend({ to: to.trim(), subject: subject.trim(), body });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex w-[520px] flex-col rounded-2xl border border-white/[0.05] bg-zinc-950/95 shadow-2xl backdrop-blur-xl pointer-events-auto"
      >
        <div className="flex items-center justify-between border-b border-white/[0.04] px-4.5 py-3.5 bg-zinc-950/60">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-350">New Message</span>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-550 hover:bg-white/[0.03] hover:text-zinc-200 transition-colors cursor-pointer">
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="flex flex-col gap-0">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
            className="border-b border-white/[0.04] bg-transparent px-4.5 py-3 text-xs font-mono text-zinc-200 outline-none placeholder:text-zinc-700"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="border-b border-white/[0.04] bg-transparent px-4.5 py-3 text-xs font-mono text-zinc-200 outline-none placeholder:text-zinc-700"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={12}
            className="resize-none bg-transparent px-4.5 py-3.5 text-xs font-mono text-zinc-200 outline-none placeholder:text-zinc-700 leading-relaxed"
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
            disabled={!to.trim() || !subject.trim() || sending}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-6 py-2.5 text-xs font-mono transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
