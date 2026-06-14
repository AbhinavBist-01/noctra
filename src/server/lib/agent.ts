const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export type AgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AgentOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

export async function agent(
  messages: AgentMessage[],
  opts: AgentOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    throw new Error("OPENROUTER_API_KEY is not set (use OpenRouter key)");

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? "openai/gpt-4o-mini",
      messages,
      max_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

export async function agentJson<T>(
  messages: AgentMessage[],
  opts: AgentOptions = {},
): Promise<T> {
  const text = await agent(
    [
      ...messages,
      { role: "user", content: "Respond with valid JSON only, no markdown." },
    ],
    { ...opts, temperature: 0 },
  );

  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
