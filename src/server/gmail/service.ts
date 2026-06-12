import { getTenant } from "../corsair/tenant";
import { mapGmailMessageDetail, mapGmailMessageSummary } from "./mapper";
import { AppError } from "../lib/app-error";
import type {
  GmailDbSearchParams,
  GmailDbListParams,
  GmailDraftCreateParams,
  GmailDraftSendParams,
  GmailMessageSendParams,
  GmailThreadListParams,
} from "../lib/corsair-types";

export const getGmailMessages = async (input: {
  query?: string;
  limit?: number;
  offset?: number;
}) => {
  try {
    const tenant = getTenant();

    if (input.query) {
      const params: GmailDbSearchParams = {
        query: input.query,
        limit: input.limit ?? 20,
        offset: input.offset ?? 0,
      };
      return tenant.gmail.db.messages.search(params as any);
    }

    const params: GmailDbListParams = {
      limit: input.limit ?? 20,
      offset: input.offset ?? 0,
    };
    const messages = await tenant.gmail.db.messages.list(params as any);
    return {
      messages: Array.isArray(messages)
        ? messages.map(mapGmailMessageSummary)
        : messages,
    };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to list messages: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const getGmailMessageById = async (id: string) => {
  try {
    const tenant = getTenant();
    const messageById = await tenant.gmail.db.messages.findById(id);
    return messageById ? mapGmailMessageDetail(messageById as any) : null;
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to get message: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const createGmailDraft = async (input: {
  to: string[];
  subject: string;
  cc?: string[];
  bcc?: string[];
  body: string;
}) => {
  try {
    const tenant = getTenant();
    const params: GmailDraftCreateParams = {
      draft: {
        message: {
          raw: Buffer.from(
            `To: ${input.to.join(", ")}\r\n` +
            `${input.cc ? `Cc: ${input.cc.join(", ")}\r\n` : ""}` +
            `${input.bcc ? `Bcc: ${input.bcc.join(", ")}\r\n` : ""}` +
            `Subject: ${input.subject}\r\n\r\n${input.body}`,
          ).toString("base64url"),
        },
      },
    };
    const draft = await tenant.gmail.api.drafts.create(params as any);
    return draft;
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to create draft: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const sendGmailDraft = async (draftId: string) => {
  try {
    const tenant = getTenant();
    const params: GmailDraftSendParams = { id: draftId };
    const sentDraft = await tenant.gmail.api.drafts.send(params as any);
    return sentDraft;
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to send draft: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const sendGmailMessage = async (input: {
  to: string[];
  subject: string;
  cc?: string[];
  bcc?: string[];
  body: string;
}) => {
  try {
    const tenant = getTenant();
    const params: GmailMessageSendParams = {
      raw: Buffer.from(
        `To: ${input.to.join(", ")}\r\n` +
        `${input.cc ? `Cc: ${input.cc.join(", ")}\r\n` : ""}` +
        `${input.bcc ? `Bcc: ${input.bcc.join(", ")}\r\n` : ""}` +
        `Subject: ${input.subject}\r\n\r\n${input.body}`,
      ).toString("base64url"),
    };
    const sentMessage = await tenant.gmail.api.messages.send(params as any);
    return sentMessage;
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const refreshGmailMessages = async () => {
  try {
    const tenant = getTenant();
    const params: GmailThreadListParams = {};
    await tenant.gmail.api.threads.list(params as any);
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to refresh: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
