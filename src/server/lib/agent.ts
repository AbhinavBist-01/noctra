import { OpenAI } from "openai";
import { telemetryService } from "../telemetry/service";

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

function getOpenAIClient(): OpenAI {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is missing from environment variables.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: openaiKey });
    console.log("[agent] Initialized OpenAI client");
  }
  return openaiClient;
}

export async function agent(
  messages: AgentMessage[],
  opts: AgentOptions = {},
): Promise<string> {
  const openai = getOpenAIClient();
  const startTime = Date.now();

  // Generous max token limit to prevent truncation mid-sentence or mid-JSON
  const maxTokens = opts.maxTokens ?? 2500;

  try {
    const model = opts.model ?? "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: opts.temperature ?? 0.2,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const latency = Date.now() - startTime;
    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;
    telemetryService.recordLLMCall(model, promptTokens, completionTokens, latency);

    return (response.choices?.[0]?.message?.content ?? "").trim();
  } catch (error) {
    throw new Error(
      `OpenAI Agent error: ${error instanceof Error ? error.message : String(error)}`,
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
    { ...opts, maxTokens: opts.maxTokens ?? 2500, temperature: 0 },
  );

  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
