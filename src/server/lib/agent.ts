import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";

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
let geminiClient: GoogleGenAI | null = null;

function getClient(): { 
  openai?: OpenAI; 
  gemini?: GoogleGenAI; 
} {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({ apiKey: geminiKey });
      console.log("[agent] Initialized native Google GenAI client");
    }
    return { gemini: geminiClient };
  } else if (openaiKey) {
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey: openaiKey });
      console.log("[agent] Initialized OpenAI client");
    }
    return { openai: openaiClient };
  } else {
    throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is set");
  }
}

export async function agent(
  messages: AgentMessage[],
  opts: AgentOptions = {},
): Promise<string> {
  const { openai, gemini } = getClient();

  if (gemini) {
    try {
      const systemInstructions = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");

      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const model = opts.model ?? "gemini-2.5-flash";

      const response = await gemini.models.generateContent({
        model,
        contents,
        config: {
          temperature: opts.temperature ?? 0.2,
          maxOutputTokens: opts.maxTokens ?? 500,
          systemInstruction: systemInstructions || undefined,
        },
      });

      return (response.text ?? "").trim();
    } catch (error) {
      throw new Error(
        `Gemini Agent error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else if (openai) {
    try {
      const model = opts.model ?? "gpt-4o-mini";
      const response = await openai.chat.completions.create({
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
        `OpenAI Agent error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    throw new Error("No active LLM client configured");
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
