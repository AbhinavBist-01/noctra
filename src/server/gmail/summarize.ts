import type { GmailMessageDetail } from "@/shared/gmail";
import { agent } from "../lib/agent";

export async function summarizeEmail(
  message: Pick<GmailMessageDetail, "from" | "subject" | "body">,
): Promise<string> {
  try {
    return await agent([
      {
        role: "system",
        content: "You summarize emails concisely in 2-3 sentences. Be direct and extract the key point.",
      },
      {
        role: "user",
        content: `From: ${message.from}\nSubject: ${message.subject}\nBody: ${message.body?.slice(0, 4000) ?? ""}`,
      },
    ], { maxTokens: 200, temperature: 0.3 });
  } catch (err) {
    console.error("Summarize request failed:", err);
    return fallbackSummary(message.body);
  }
}

function fallbackSummary(body?: string): string {
  if (!body) return "No content to summarize.";
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 200) return cleaned;
  return cleaned.slice(0, 200) + "...";
}
