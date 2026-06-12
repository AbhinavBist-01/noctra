import { getTenant } from "../corsair/tenant";

export const getGmailMessages = async (input: {
  query?: string;
  limit?: number;
  offset?: number;
}) => {
  const tenant = getTenant();

  if (input.query) {
    return tenant.gmail.db.messages.search({
      query: input.query,
      limit: input.limit ?? 20,
      offset: input.offset ?? 0,
    } as any);
  }

  const messages = await tenant.gmail.db.messages.list({
    limit: input.limit ?? 20,
    offset: input.offset ?? 0,
  });
  return messages;
};

export const getGmailMessageById = async (id: string) => {
  const tenant = getTenant();
  const messageById = await tenant.gmail.db.messages.findById(id);
  return messageById;
};

export const createGmailDraft = async (input: {
  to: string[];
  subject: string;
  cc?: string[];
  bcc?: string[];
  body: string;
}) => {
  const tenant = getTenant();

  const draft = await tenant.gmail.api.drafts.create({
    to: input.to,
    subject: input.subject,
    cc: input.cc,
    bcc: input.bcc,
    body: input.body,
  } as any);
  return draft;
};

export const sendGmailDraft = async (draftId: string) => {
  const tenant = getTenant();
  const sentDraft = await tenant.gmail.api.drafts.send({ draftId } as any);
  return sentDraft;
};

export const sendGmailMessage = async (input: {
  to: string[];
  subject: string;
  cc?: string[];
  bcc?: string[];
  body: string;
}) => {
  const tenant = getTenant();
  const sentMessage = await tenant.gmail.api.messages.send({
    to: input.to,
    subject: input.subject,
    cc: input.cc,
    bcc: input.bcc,
    body: input.body,
  } as any);
  return sentMessage;
};

export const refreshGmailMessages = async () => {
  const tenant = getTenant();
  await tenant.gmail.api.threads.list({});
};
