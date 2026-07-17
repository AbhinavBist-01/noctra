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

export async function summarizeEmailsBatch(
  messages: Array<{ from?: string; subject?: string; body?: string }>
): Promise<string> {
  try {
    const formattedList = messages
      .map(
        (m, idx) =>
          `[Email ${idx + 1}]\nFrom: ${m.from ?? "Unknown"}\nSubject: ${m.subject ?? "(No Subject)"}\nBody: ${m.body?.slice(0, 1000) ?? ""}`
      )
      .join("\n\n---\n\n");

    return await agent([
      {
        role: "system",
        content:
          "You are an AI inbox assistant. Provide a single, consolidated, professional overview of the following list of emails in bullet points. Highlight key action items or critical notices. Be very concise and clear.",
      },
      {
        role: "user",
        content: `Summarize the following recent emails:\n\n${formattedList}`,
      },
    ], { maxTokens: 400, temperature: 0.3 });
  } catch (err) {
    console.error("Batch summarize request failed:", err);
    return "Failed to generate batch summary.";
  }
}
