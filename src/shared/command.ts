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
