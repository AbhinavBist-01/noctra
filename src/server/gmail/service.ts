import { getTenant } from "../corsair/tenant";
import { mapGmailMessageDetail, mapGmailMessageSummary } from "./mapper";
import { AppError } from "../lib/app-error";
import type {
  GmailDraftCreateParams,
  GmailDraftSendParams,
  GmailMessageSendParams,
  GmailMessageListParams,
} from "../lib/corsair-types";

const sortByInternalDateDesc = (msgs: any[]) =>
  [...msgs].sort((a, b) => {
    const dateA = a.internalDate ? Number(a.internalDate) : 0;
    const dateB = b.internalDate ? Number(b.internalDate) : 0;
    return dateB - dateA;
  });

const fetchFullMessage = async (tenant: any, partial: any) => {
  const id = partial.id ?? partial.entityId;
  if (!id) return partial;
  const data = partial.data ?? partial;
  if (data.payload?.headers) return data;

  // Log the first message's shape for debugging
  if (!(globalThis as any).__gmailDebugLogged) {
    (globalThis as any).__gmailDebugLogged = true;
    console.log("[DEBUG] partial keys:", Object.keys(partial));
    console.log("[DEBUG] partial.data keys:", data ? Object.keys(data) : "no data");
    console.log("[DEBUG] partial snippet:", data?.snippet);
    console.log("[DEBUG] partial.from:", data?.from);
    console.log("[DEBUG] partial.payload:", data?.payload ? "exists" : "missing");
  }

  try {
    const cached = await tenant.gmail.db.messages.findByEntityId(id);
    const full = cached?.data ?? cached;
    if (full?.payload?.headers) return full;
  } catch { /* not in cache */ }
  try {
    const fetched = await tenant.gmail.api.messages.get({ id } as any);
    return fetched.data ?? fetched;
  } catch { return data; }
};

export const getGmailMessages = async (input: {
  query?: string;
  limit?: number;
  cursor?: string;
}) => {
  try {
    const tenant = getTenant();
    const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
    const limit = input.limit ?? 20;

    let allMessages;
    if (input.query) {
      const raw = await tenant.gmail.api.messages.get({ query: input.query } as any);
      allMessages = Array.isArray(raw) ? raw : ((raw as any)?.messages ?? []);
      allMessages = await Promise.all(allMessages.map((m: any) => fetchFullMessage(tenant, m)));
    } else {
      // Direct list from local database cache (instant)
      const raw = await tenant.gmail.db.messages.list({} as any);
      const list = Array.isArray(raw) ? raw : [];
      allMessages = list.map((m: any) => m.data ?? m);
    }

    const sorted = sortByInternalDateDesc(allMessages);
    const paged = sorted.slice(offset, offset + limit + 1);
    const hasMore = paged.length > limit;
    const messages = hasMore ? paged.slice(0, limit) : paged;

    return {
      messages: messages.map((m: any) => mapGmailMessageSummary(m)),
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
    let entity = await tenant.gmail.db.messages.findByEntityId(messageId);
    if (!entity) {
      const fetched = await tenant.gmail.api.messages.get({ id: messageId } as any);
      const data = (fetched as any).data ?? fetched;
      if (data) {
        await tenant.gmail.db.messages.upsertByEntityId(messageId, data);
        entity = await tenant.gmail.db.messages.findByEntityId(messageId);
      }
    }
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
    return {
      drafts: drafts.map((d: any) => mapGmailMessageSummary(d.message ?? d)),
    };
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

    // Sync both INBOX and SENT labels
    const labelsToSync = ["INBOX", "SENT"];
    const seenIds = new Set<string>();

    for (const label of labelsToSync) {
      const listParams: GmailMessageListParams = {
        maxResults: 50,
        labelIds: [label],
      };
      const listRes = await tenant.gmail.api.messages.list(listParams as any);
      const items = (listRes as any)?.messages ?? [];
      for (const item of items) {
        if (item?.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          const fetched = await tenant.gmail.api.messages.get({ id: item.id } as any);
          const data = (fetched as any).data ?? fetched;
          if (data) {
            await tenant.gmail.db.messages.upsertByEntityId(item.id, data);
          }
        }
      }
    }

    // Sync drafts
    try {
      const draftsRes = await tenant.gmail.api.drafts.list({ maxResults: 20 } as any);
      const draftsItems = (draftsRes as any)?.drafts ?? [];
      for (const item of draftsItems) {
        if (item?.id) {
          const fetched = await tenant.gmail.api.drafts.get({ id: item.id } as any);
          const data = (fetched as any).data ?? fetched;
          if (data) {
            await tenant.gmail.db.drafts.upsertByEntityId(item.id, data);
          }
        }
      }
    } catch (err: any) {
      console.log(`[Sync] Drafts sync skipped/failed: ${err.message}`);
    }
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to refresh: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const trashGmailMessage = async (messageId: string) => {
  try {
    const tenant = getTenant();
    await tenant.gmail.api.messages.trash({ id: messageId } as any);
    return { success: true };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to trash message: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
