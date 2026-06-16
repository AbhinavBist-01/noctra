import type {
  CommandPreviewRequest,
  CommandPreviewResponse,
  CommandExecuteRequest,
  CommandExecuteResponse,
} from "@/shared/command";
import { parseCommandWithAgent, parseCommand } from "./parser";
import { executeActions } from "./executor";

export const previewCommand = async (
  input: CommandPreviewRequest,
): Promise<CommandPreviewResponse> => {
  // Try LLM parser first, fall back to regex if agent fails
  const useAgent = process.env.OPENROUTER_API_KEY !== undefined;
  
  if (useAgent) {
    return await parseCommandWithAgent(input.command);
  } else {
    // Fallback to regex parser if no OPENROUTER_API_KEY
    return parseCommand(input.command);
  }
};

export const executeCommand = async (
  input: CommandExecuteRequest,
): Promise<CommandExecuteResponse> => {
  const results = await executeActions(input.actions);
  return { results };
};
