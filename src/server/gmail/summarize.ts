import type { GmailMessageDetail } from "@/shared/gmail";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function summarizeEmail(
  message: Pick<GmailMessageDetail, "from" | "subject" | "body">,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackSummary(message.body);
  }

  const prompt = `Summarize this email concisely in 2-3 sentences:

From: ${message.from}
Subject: ${message.subject}
Body: ${message.body?.slice(0, 4000) ?? ""}`;

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("OpenAI API error:", res.status, errBody);
      return fallbackSummary(message.body);
    }

    const json = await res.json();
    return (json.choices?.[0]?.message?.content ?? fallbackSummary(message.body)).trim();
  } catch (err) {
    console.error("OpenAI request failed:", err);
    return fallbackSummary(message.body);
  }
}

function fallbackSummary(body?: string): string {
  if (!body) return "No content to summarize.";
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 200) return cleaned;
  return cleaned.slice(0, 200) + "...";
}
