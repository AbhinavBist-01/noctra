import { getTenant } from "../corsair/tenant";

export const listGmailMessages = async (input: {
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

export const getGmailMessage = async (id: string) => {
  const tenant = getTenant();
  const messageById = await tenant.gmail.db.messages.findById(id);
  return messageById;
};

export const createGmailDraft = async (input: {
  to: string;
  subject: string;
  cc?: string;
  bcc?: string;
  body: string;
}) => {
  const tenant = getTenant();

  // upsertByEntityId expects an entityId as the first argument.
  // Generate a stable-enough entityId for the draft if one isn't provided.
  const entityId = `${input.to}-${Date.now()}`;
  const draft = await tenant.gmail.db.drafts.upsertByEntityId(entityId, {
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
  const sentDraft = await tenant.gmail.db.drafts.findById({ draftId } as any);
  return sentDraft;
};

export const sendGmailMessage = async (input: {
  to: string;
  subject: string;
  cc?: string;
  bcc?: string;
  body: string;
}) => {
  const tenant = getTenant();
  const entityId = `${input.to}-${Date.now()}`;
  const sentMessage = await tenant.gmail.db.messages.upsertByEntityId(
    entityId,
    {
      to: input.to,
      subject: input.subject,
      cc: input.cc,
      bcc: input.bcc,
      body: input.body,
    } as any,
  );
  return sentMessage;
};
