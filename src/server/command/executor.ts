import type {
  CommandPreviewAction,
  CommandExecutionResult,
} from "@/shared/command";
import { createGmailDraft, sendGmailMessage } from "../gmail/service";
import { createCalendarInvite } from "../calendar/service";

export const executeAction = async (
  action: CommandPreviewAction,
  userId?: string,
): Promise<CommandExecutionResult> => {
  try {
    if (action.type === "email_draft") {
      const result = await createGmailDraft({
        to: action.to,
        subject: action.subject,
        body: action.body,
        userId,
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
        userId,
      });
      return {
        actionId: action.id,
        type: action.type,
        status: "success",
        result,
      };
    }

    if (action.type === "calendar_invite") {
      const result = await createCalendarInvite(
        {
          title: action.title,
          description: action.description,
          start: action.start,
          end: action.end,
          timezone: action.timezone,
          attendees: action.attendees,
        },
        userId,
      );
      return {
        actionId: action.id,
        type: action.type,
        status: "success",
        result,
      };
    }

    const fallbackAction = action as CommandPreviewAction;
    return {
      actionId: fallbackAction.id,
      type: fallbackAction.type,
      status: "failed",
      error: `Unknown action type: ${fallbackAction.type}`,
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
  userId?: string,
): Promise<CommandExecutionResult[]> => {
  const results: CommandExecutionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, userId);
    results.push(result);
  }

  return results;
};
