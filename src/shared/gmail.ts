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
  nextOffset?: number;
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
