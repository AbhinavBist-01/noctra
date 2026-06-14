"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";

type Props = {
  onExecute: (cmd: string) => void;
  suggestion?: string;
  onClearSuggestion: () => void;
};

export const CommandBar = forwardRef<{ focus: () => void }, Props>(
  function CommandBar({ onExecute, suggestion, onClearSuggestion }, ref) {
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      if (suggestion) {
        setInput(suggestion);
        inputRef.current?.focus();
      }
    }, [suggestion]);

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setInput("");
          onClearSuggestion();
          inputRef.current?.blur();
        }
      };
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }, [onClearSuggestion]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim()) {
        onExecute(input.trim());
        setInput("");
        onClearSuggestion();
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900 px-4 py-3"
      >
        <span className="text-xs font-medium text-zinc-500">CMD</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command... (e.g. 'Send email to friend@example.com saying hello')"
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    );
  },
);
