import { OpenAI } from "openai";

export type AgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AgentOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
};

let openaiClient: OpenAI | null = null;
let isGeminiMode = false;

function getOpenAIClient(): { client: OpenAI; isGemini: boolean } {
  if (!openaiClient) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      openaiClient = new OpenAI({
        apiKey: geminiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
      isGeminiMode = true;
      console.log("[agent] Initialized Gemini client via OpenAI compatibility layer");
    } else if (openaiKey) {
      openaiClient = new OpenAI({ apiKey: openaiKey });
      isGeminiMode = false;
      console.log("[agent] Initialized OpenAI client");
    } else {
      throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is set");
    }
  }
  return { client: openaiClient, isGemini: isGeminiMode };
}

export async function agent(
  messages: AgentMessage[],
  opts: AgentOptions = {},
): Promise<string> {
  const { client, isGemini } = getOpenAIClient();
  const model = opts.model ?? (isGemini ? "gemini-1.5-flash" : "gpt-4o-mini");

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: opts.maxTokens ?? 500,
      temperature: opts.temperature ?? 0.2,
      messages: messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
    });

    return (response.choices?.[0]?.message?.content ?? "").trim();
  } catch (error) {
    throw new Error(
      `${isGemini ? "Gemini" : "OpenAI"} Agent error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
