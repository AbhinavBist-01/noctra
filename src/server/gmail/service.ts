import { getTenant } from "../corsair/tenant";
import { mapGmailMessageDetail, mapGmailMessageSummary } from "./mapper";
import { AppError } from "../lib/app-error";
import type {
  GmailDbSearchParams,
  GmailDbListParams,
  GmailDraftCreateParams,
  GmailDraftSendParams,
  GmailMessageSendParams,
  GmailMessageListParams,
} from "../lib/corsair-types";

export const getGmailMessages = async (input: {
  query?: string;
  limit?: number;
  cursor?: string;
}) => {
  try {
    const tenant = getTenant();
    const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
    const limit = input.limit ?? 20;

    if (input.query) {
      const params: GmailDbSearchParams = {
        query: input.query,
        limit: limit + 1,
        offset,
      };
      const raw = await tenant.gmail.db.messages.search(params as any);
      const allMessages = Array.isArray(raw) ? raw : [];
      const hasMore = allMessages.length > limit;
      const messages = hasMore ? allMessages.slice(0, limit) : allMessages;
      return {
        messages: messages.map((m: any) => mapGmailMessageSummary(m.data ?? m)),
        nextCursor: hasMore ? String(offset + limit) : undefined,
      };
    }

    const params: GmailDbListParams = { limit: limit + 1, offset };
    const raw = await tenant.gmail.db.messages.list(params as any);
    const allMessages = Array.isArray(raw) ? raw : [];

    const hasMore = allMessages.length > limit;
    const messages = hasMore ? allMessages.slice(0, limit) : allMessages;

    return {
      messages: messages.map((m: any) => mapGmailMessageSummary(m.data ?? m)),
      nextCursor: hasMore ? String(offset + limit) : undefined,
    };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to list messages: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const getGmailMessageById = async (messageId: string) => {
  try {
    const tenant = getTenant();
    const entity = await tenant.gmail.db.messages.findByEntityId(messageId);
    if (!entity) return null;
    return mapGmailMessageDetail(entity.data ?? entity);
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

export const getGmailDrafts = async () => {
  try {
    const tenant = getTenant();
    const raw = await tenant.gmail.db.drafts.list({} as any);
    const drafts = Array.isArray(raw) ? raw : [];
    return { drafts: drafts.map((d: any) => mapGmailMessageSummary(d.message ?? d)) };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to list drafts: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const refreshGmailMessages = async () => {
  try {
    const tenant = getTenant();
    const listParams: GmailMessageListParams = { maxResults: 50 };
    const listRes = await tenant.gmail.api.messages.list(listParams as any);
    const items = (listRes as any)?.messages ?? [];
    for (const item of items) {
      if (item?.id) {
        await tenant.gmail.api.messages.get({ id: item.id } as any);
      }
    }
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to refresh: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
