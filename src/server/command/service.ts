import type {
  CommandPreviewRequest,
  CommandPreviewResponse,
  CommandExecuteRequest,
  CommandExecuteResponse,
} from "@/shared/command";
import { parseCommandWithAgent, parseCommand } from "./parser";
import { executeActions } from "./executor";
import { telemetryService } from "../telemetry/service";

export const previewCommand = async (
  input: CommandPreviewRequest,
): Promise<CommandPreviewResponse> => {
  const startTime = Date.now();
  telemetryService.setActiveStep("request");
  
  // Simulate active pipeline stages
  telemetryService.recordActivity("Planner", `Parsing query: "${input.command}"`, "running");
  
  // Try LLM parser first, fall back to regex if agent fails
  const useAgent =
    process.env.GEMINI_API_KEY !== undefined ||
    process.env.OPENAI_API_KEY !== undefined ||
    process.env.OPENROUTER_API_KEY !== undefined;
  
  let result;
  try {
    telemetryService.setActiveStep("router");
    if (useAgent) {
      telemetryService.setActiveStep("agent");
      result = await parseCommandWithAgent(input.command, input.history);
    } else {
      result = parseCommand(input.command);
    }
    
    const latency = Date.now() - startTime;
    telemetryService.setActiveStep("response");
    telemetryService.recordQuery("codebase", input.command, latency);
    telemetryService.recordActivity("Parser", `Successfully parsed command: "${input.command}"`, "done", latency);
    
    // Quick delay reset to idle
    setTimeout(() => telemetryService.setActiveStep("idle"), 2000);
  } catch (error: any) {
    telemetryService.setActiveStep("idle");
    telemetryService.recordActivity("Parser", `Failed to parse: ${error.message}`, "idle");
    throw error;
  }
  
  return result;
};

export const executeCommand = async (
  input: CommandExecuteRequest,
  userId?: string,
): Promise<CommandExecuteResponse> => {
  const startTime = Date.now();
  telemetryService.setActiveStep("tools");
  telemetryService.recordActivity("Scheduler", `Executing ${input.actions.length} actions`, "running");

  try {
    const results = await executeActions(input.actions, userId);
    const latency = Date.now() - startTime;
    telemetryService.setActiveStep("response");
    
    const successCount = results.filter(r => r.status === "success").length;
    telemetryService.recordActivity(
      "Executor", 
      `Executed ${results.length} actions (${successCount} succeeded)`, 
      "done", 
      latency
    );
    
    setTimeout(() => telemetryService.setActiveStep("idle"), 2000);
    return { results };
  } catch (error: any) {
    telemetryService.setActiveStep("idle");
    telemetryService.recordActivity("Executor", `Execution failed: ${error.message}`, "idle");
    throw error;
  }
};
