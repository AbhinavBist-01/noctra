import { z } from "zod";

export const ListGmailMessagesQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  cursor: z.string().optional(),
});

export const GetGmailMessageParamsSchema = z.object({
  messageId: z.string().min(1),
});

export const CreateGmailDraftRequestSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const SendGmailMessageRequestSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const SendGmailDraftParamsSchema = z.object({
  draftId: z.string().min(1),
});

export type GmailMessageSummary = {
  id: string;
  threadId?: string;
  from?: string;
  to?: string[];
  subject?: string;
  snippet?: string;
  receivedAt?: string;
  labels?: string[];
  priority?: "low" | "normal" | "high";
};

export type GmailMessageDetail = GmailMessageSummary & {
  body?: string;
};

export type ListGmailMessagesResponse = {
  messages: GmailMessageSummary[];
  nextCursor?: string;
};

export type CreateGmailDraftRequest = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
};

export type CreateGmailDraftResponse = {
  draftId: string;
  messageId?: string;
};

export type SendGmailDraftRequest = {
  draftId: string;
};

export type SendGmailResponse = {
  messageId: string;
};
