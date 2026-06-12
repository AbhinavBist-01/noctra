import type {
  CommandPreviewRequest,
  CommandPreviewResponse,
  CommandExecuteRequest,
  CommandExecuteResponse,
} from "@/shared/command";
import { parseCommand } from "./parser";
import { executeActions } from "./executor";

export const previewCommand = (
  input: CommandPreviewRequest,
): CommandPreviewResponse => {
  return parseCommand(input.command);
};

export const executeCommand = async (
  input: CommandExecuteRequest,
): Promise<CommandExecuteResponse> => {
  const results = await executeActions(input.actions);
  return { results };
};
