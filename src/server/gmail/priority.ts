import type { GmailMessageSummary } from "@/shared/gmail";

export const classifyGmailPriority = (
  message: Pick<
    GmailMessageSummary,
    "from" | "subject" | "snippet" | "labels"
  >,
): "low" | "normal" | "high" => {
  const text = [
    message.from,
    message.subject,
    message.snippet,
    ...(message.labels ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("urgent") ||
    text.includes("asap") ||
    text.includes("action required") ||
    text.includes("deadline") ||
    text.includes("invoice due") ||
    text.includes("security alert")
  ) {
    return "high";
  }

  if (
    text.includes("newsletter") ||
    text.includes("unsubscribe") ||
    text.includes("promotion") ||
    text.includes("sale") ||
    text.includes("digest")
  ) {
    return "low";
  }

  return "normal";
};
