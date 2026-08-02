"use client";

import React from "react";
import { Lightning, PushPin, Calendar, WarningCircle, CheckCircle } from "@phosphor-icons/react";

interface FormattedMessageTextProps {
  text: string;
  className?: string;
}

export function FormattedMessageText({ text, className = "" }: FormattedMessageTextProps) {
  if (!text) return null;

  // Split text into lines/paragraphs for parsing
  const lines = text.split("\n");

  return (
    <div className={`space-y-2 text-[13px] leading-relaxed text-zinc-200 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Header 1-3
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-base font-bold text-amber-400 mt-3 mb-1 font-display tracking-tight">
              {parseInlineMarkdown(trimmed.replace(/^#\s+/, ""))}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-sm font-bold text-zinc-100 mt-2.5 mb-1 font-display tracking-tight border-b border-white/[0.06] pb-1">
              {parseInlineMarkdown(trimmed.replace(/^##\s+/, ""))}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-xs font-bold text-zinc-200 mt-2 mb-0.5 uppercase tracking-wider font-mono">
              {parseInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
            </h3>
          );
        }

        // Section Badges / Highlight Cards
        if (trimmed.includes("⚡") || trimmed.includes("Action Required")) {
          return (
            <div key={idx} className="my-2 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] p-3 text-amber-200">
              <Lightning size={16} weight="fill" className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-normal">
                {parseInlineMarkdown(trimmed.replace(/^[⚡\s\-\*]+/, ""))}
              </div>
            </div>
          );
        }

        if (trimmed.includes("🚨") || trimmed.includes("High Priority")) {
          return (
            <div key={idx} className="my-2 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-3 text-rose-200">
              <WarningCircle size={16} weight="fill" className="text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-normal">
                {parseInlineMarkdown(trimmed.replace(/^[🚨\s\-\*]+/, ""))}
              </div>
            </div>
          );
        }

        if (trimmed.includes("📌") || trimmed.includes("Main Purpose")) {
          return (
            <div key={idx} className="my-1.5 flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-2.5 text-blue-200">
              <PushPin size={15} weight="fill" className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-normal">
                {parseInlineMarkdown(trimmed.replace(/^[📌\s\-\*]+/, ""))}
              </div>
            </div>
          );
        }

        if (trimmed.includes("📅") || trimmed.includes("Important Details")) {
          return (
            <div key={idx} className="my-1.5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-2.5 text-emerald-200">
              <Calendar size={15} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-normal">
                {parseInlineMarkdown(trimmed.replace(/^[📅\s\-\*]+/, ""))}
              </div>
            </div>
          );
        }

        // Bullet Points
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
          const bulletText = trimmed.replace(/^([\-\*]|\d+\.)\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 my-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80 shrink-0 mt-2" />
              <div className="text-xs text-zinc-300 leading-relaxed flex-1">
                {parseInlineMarkdown(bulletText)}
              </div>
            </div>
          );
        }

        // Code block line / formatted paragraph
        return (
          <p key={idx} className="text-xs text-zinc-300 leading-relaxed font-sans">
            {parseInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Helper to parse bold (**text**), italic (*text*), inline code (`code`), and links.
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to split by bold (**text**), inline code (`code`), or highlight
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-zinc-100 font-sans">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[11px] text-amber-300 border border-white/[0.05]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={i} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
