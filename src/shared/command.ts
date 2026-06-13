import { z } from "zod";
import { type CalendarAttendee } from "./calendar";

export type CommandPreviewRequest = {
  command: string;
};

export type CommandActionType =
  | "email_draft"
  | "email_send"
  | "calendar_invite";

export type EmailCommandAction = {
  id: string;
  type: "email_draft" | "email_send";
  to: string[];
  subject: string;
  body: string;
};

export type CalendarInviteCommandAction = {
  id: string;
  type: "calendar_invite";
  title: string;
  description?: string;
  start: string;
  end: string;
  timezone?: string;
  attendees: CalendarAttendee[];
};

export type CommandPreviewAction =
  | EmailCommandAction
  | CalendarInviteCommandAction;

export type CommandPreviewResponse = {
  actions: CommandPreviewAction[];
  warnings?: string[];
};

export type CommandExecuteRequest = {
  actions: CommandPreviewAction[];
};

export type CommandExecutionResult = {
  actionId: string;
  type: CommandActionType;
  status: "success" | "failed";
  result?: unknown;
  error?: string;
};

export type CommandExecuteResponse = {
  results: CommandExecutionResult[];
};

export const PreviewRequestSchema = z.object({
  command: z.string().min(1),
});

export const ActionSchema = z.object({
  id: z.string(),
  type: z.enum(["email_draft", "email_send", "calendar_invite"]),
  to: z.array(z.string()).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  timezone: z.string().optional(),
  attendees: z
    .array(z.object({ email: z.string(), name: z.string().optional() }))
    .optional(),
});

export const ExecuteRequestSchema = z.object({
  actions: z.array(ActionSchema),
});
