import type { GmailMessageDetail } from "@/shared/gmail";
import { agent } from "../lib/agent";

/**
 * Strips raw HTML markup, CSS blocks, script tags, and quoted email reply chains
 * to keep the payload clean and fast for LLM summarization.
 */
function stripHtmlAndQuotes(text: string): string {
  if (!text) return "";
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/On\s+[\s\S]*?wrote:[\s\S]*/gi, "") // strip email reply thread
    .replace(/From:[\s\S]*?Sent:[\s\S]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function summarizeEmail(
  message: Pick<GmailMessageDetail, "from" | "subject" | "body">,
): Promise<string> {
  try {
    const cleanBody = stripHtmlAndQuotes(message.body ?? "");
    if (!cleanBody) return fallbackSummary(message.body);

    return await agent(
      [
        {
          role: "system",
          content:
            "You are an executive email assistant. Summarize this email concisely by highlighting ONLY the important key points:\n" +
            "- 📌 **Main Purpose**: What is this email about?\n" +
            "- ⚡ **Action Required**: Any request or next steps? (Omit if none)\n" +
            "- 📅 **Important Details**: Any key dates, deadlines, or numbers? (Omit if none)\n\n" +
            "Be extremely clear and direct. Maximum 3 bullet points. No unnecessary fluff.",
        },
        {
          role: "user",
          content: `From: ${message.from}\nSubject: ${message.subject}\nBody: ${cleanBody.slice(0, 3000)}`,
        },
      ],
      { maxTokens: 250, temperature: 0.2 },
    );
  } catch (err) {
    console.error("Summarize request failed:", err);
    return fallbackSummary(message.body);
  }
}

function fallbackSummary(body?: string): string {
  if (!body) return "No content to summarize.";
  const cleaned = stripHtmlAndQuotes(body);
  if (cleaned.length <= 200) return cleaned;
  return cleaned.slice(0, 200) + "...";
}

export async function summarizeEmailsBatch(
  messages: Array<{ from?: string; subject?: string; body?: string }>,
): Promise<string> {
  try {
    const formattedList = messages
      .map((m, idx) => {
        const cleanBody = stripHtmlAndQuotes(m.body ?? "");
        return `[Email ${idx + 1}]\nFrom: ${m.from ?? "Unknown"}\nSubject: ${m.subject ?? "(No Subject)"}\nBody Snippet: ${cleanBody.slice(0, 600)}`;
      })
      .join("\n\n---\n\n");

    return await agent(
      [
        {
          role: "system",
          content:
            "You are an AI executive assistant summarizing recent inbox messages. Output a structured executive brief:\n\n" +
            "⚡ **Action Required**: Highlight any emails needing immediate response, action, or decision.\n" +
            "📌 **Important Highlights**: Summarize key updates or notices in concise bullet points.\n\n" +
            "Keep it extremely punchy and actionable. Omit marketing spam or low-priority details.",
        },
        {
          role: "user",
          content: `Emails to summarize:\n\n${formattedList}`,
        },
      ],
      { maxTokens: 350, temperature: 0.2 },
    );
  } catch (err) {
    console.error("Batch summarize request failed:", err);
    return "Failed to generate batch summary.";
  }
}
