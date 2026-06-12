import type {
  CommandPreviewAction,
  CommandExecutionResult,
} from "@/shared/command";
import { createGmailDraft, sendGmailMessage } from "../gmail/service";
import { createCalendarInvite } from "../calendar/service";

export const executeAction = async (
  action: CommandPreviewAction,
): Promise<CommandExecutionResult> => {
  try {
    if (action.type === "email_draft") {
      const result = await createGmailDraft({
        to: action.to,
        subject: action.subject,
        body: action.body,
      });
      return {
        actionId: action.id,
        type: action.type,
        status: "success",
        result,
      };
    }

    if (action.type === "email_send") {
      const result = await sendGmailMessage({
        to: action.to,
        subject: action.subject,
        body: action.body,
      });
      return {
        actionId: action.id,
        type: action.type,
        status: "success",
        result,
      };
    }

    if (action.type === "calendar_invite") {
      const result = await createCalendarInvite({
        title: action.title,
        description: action.description,
        start: action.start,
        end: action.end,
        timezone: action.timezone,
        attendees: action.attendees,
      });
      return {
        actionId: action.id,
        type: action.type,
        status: "success",
        result,
      };
    }

    return {
      actionId: action.id,
      type: action.type,
      status: "failed",
      error: `Unknown action type: ${(action as any).type}`,
    };
  } catch (error) {
    return {
      actionId: action.id,
      type: action.type,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const executeActions = async (
  actions: CommandPreviewAction[],
): Promise<CommandExecutionResult[]> => {
  const results: CommandExecutionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action);
    results.push(result);
  }

  return results;
};
