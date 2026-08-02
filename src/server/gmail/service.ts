import { getTenant } from "../corsair/tenant";
import { mapGmailMessageDetail, mapGmailMessageSummary, type RawGmailMessage } from "./mapper";
import { AppError } from "../lib/app-error";
import { telemetryService } from "../telemetry/service";
import type {
  GmailDraftCreateParams,
  GmailDraftSendParams,
  GmailMessageSendParams,
  GmailMessageListParams,
} from "../lib/corsair-types";

type TenantType = ReturnType<typeof getTenant>;

const sortByInternalDateDesc = (msgs: RawGmailMessage[]) =>
  [...msgs].sort((a, b) => {
    const dateA = a.internalDate ? Number(a.internalDate) : 0;
    const dateB = b.internalDate ? Number(b.internalDate) : 0;
    return dateB - dateA;
  });

const fetchFullMessage = async (
  tenant: TenantType,
  partial: { id?: string; entityId?: string; data?: RawGmailMessage } & RawGmailMessage,
): Promise<RawGmailMessage> => {
  const id = partial.id ?? partial.entityId;
  if (!id) return partial;
  const data = partial.data ?? partial;
  if (data.payload?.headers) return data;

  try {
    const cached = await tenant.gmail.db.messages.findByEntityId(id);
    const cachedRow = cached as unknown as { data?: RawGmailMessage } | null;
    const full = (cachedRow?.data ?? cached) as RawGmailMessage | undefined;
    if (full?.payload?.headers) return full;
  } catch { /* not in cache */ }
  try {
    const fetched = await tenant.gmail.api.messages.get({ id });
    return ((fetched as any).data ?? fetched) as RawGmailMessage;
  } catch { return data; }
};

export const getGmailMessages = async (input: {
  query?: string;
  limit?: number;
  cursor?: string;
  userId?: string;
}) => {
  const startTime = Date.now();
  try {
    const tenant = getTenant(input.userId);
    const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
    const limit = input.limit ?? 20;

    let allMessages: RawGmailMessage[];
    if (input.query) {
      const raw = await tenant.gmail.api.messages.list({ q: input.query });
      const rawMessages = (raw && typeof raw === "object" && "messages" in raw) ? (raw.messages ?? []) : (Array.isArray(raw) ? raw : []);
      allMessages = await Promise.all(
        (rawMessages as Array<{ id?: string; entityId?: string; data?: RawGmailMessage } & RawGmailMessage>).map((m) =>
          fetchFullMessage(tenant, m)
        )
      );
    } else {
      // Direct list from local database cache (instant)
      const raw = await tenant.gmail.db.messages.list({});
      const list = Array.isArray(raw) ? raw : [];
      allMessages = list.map((m) => {
        const cachedRow = m as unknown as { data?: RawGmailMessage } | null;
        const rawMsg = cachedRow?.data ?? m;
        return rawMsg as RawGmailMessage;
      });
    }

    // Deduplicate by message ID to prevent duplicate React keys
    const seenIds = new Set<string>();
    allMessages = allMessages.filter((m) => {
      const id = m?.id;
      if (!id) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    const sorted = sortByInternalDateDesc(allMessages);
    const paged = sorted.slice(offset, offset + limit + 1);
    const hasMore = paged.length > limit;
    const messages = hasMore ? paged.slice(0, limit) : paged;

    const duration = Date.now() - startTime;
    telemetryService.recordToolCall("web_search", duration); // Gmail API calls
    telemetryService.recordToolCall("vector_query", Math.round(duration * 0.1)); // Local cache queries
    telemetryService.recordActivity(
      "GmailService",
      `Listed ${messages.length} messages from cache`,
      "done",
      duration
    );

    return {
      messages: messages.map((m) => mapGmailMessageSummary(m)),
      nextCursor: hasMore ? String(offset + limit) : undefined,
    };
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to list messages: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const getGmailMessageById = async (messageId: string, userId?: string) => {
  try {
    const tenant = getTenant(userId);
    let entity = await tenant.gmail.db.messages.findByEntityId(messageId);
    if (!entity) {
      const fetched = await tenant.gmail.api.messages.get({ id: messageId });
      const data = (fetched && typeof fetched === "object" && "data" in fetched && fetched.data)
        ? fetched.data
        : fetched;
      if (data) {
        const upsertData = {
          ...data,
          id: messageId,
        } as Parameters<typeof tenant.gmail.db.messages.upsertByEntityId>[1];
        await tenant.gmail.db.messages.upsertByEntityId(messageId, upsertData);
        entity = await tenant.gmail.db.messages.findByEntityId(messageId);
      }
    }
    if (!entity) return null;
    const cachedRow = entity as unknown as { data?: RawGmailMessage } | null;
    const entityData = cachedRow?.data ?? entity;
    return mapGmailMessageDetail(entityData as RawGmailMessage);
  } catch (error: unknown) {
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
  userId?: string;
}) => {
  try {
    const tenant = getTenant(input.userId);
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
    const draft = await tenant.gmail.api.drafts.create(params);
    return draft;
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to create draft: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const sendGmailDraft = async (draftId: string, userId?: string) => {
  try {
    const tenant = getTenant(userId);
    const params: GmailDraftSendParams = { id: draftId };
    const sentDraft = await tenant.gmail.api.drafts.send(params);
    return sentDraft;
  } catch (error: unknown) {
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
  userId?: string;
}) => {
  try {
    const tenant = getTenant(input.userId);
    const params: GmailMessageSendParams = {
      raw: Buffer.from(
        `To: ${input.to.join(", ")}\r\n` +
          `${input.cc ? `Cc: ${input.cc.join(", ")}\r\n` : ""}` +
          `${input.bcc ? `Bcc: ${input.bcc.join(", ")}\r\n` : ""}` +
          `Subject: ${input.subject}\r\n\r\n${input.body}`,
      ).toString("base64url"),
    };
    const sentMessage = await tenant.gmail.api.messages.send(params);
    return sentMessage;
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const getGmailDrafts = async (userId?: string) => {
  try {
    const tenant = getTenant(userId);
    const raw = await tenant.gmail.db.drafts.list({});
    const drafts = Array.isArray(raw) ? raw : [];
    
    // Deduplicate drafts by message/draft ID
    const seenIds = new Set<string>();
    const uniqueDrafts = drafts.filter((d) => {
      const rawDraft = d as unknown as {
        data?: { message?: RawGmailMessage; id?: string };
        message?: RawGmailMessage;
        id?: string;
      };
      const msg = rawDraft.data?.message ?? rawDraft.data ?? rawDraft.message ?? rawDraft;
      const id = msg?.id;
      if (!id) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    return {
      drafts: uniqueDrafts.map((d) => {
        const rawDraft = d as unknown as {
          data?: { message?: RawGmailMessage; id?: string };
          message?: RawGmailMessage;
          id?: string;
        };
        const msg = rawDraft.data?.message ?? rawDraft.data ?? rawDraft.message ?? rawDraft;
        return mapGmailMessageSummary(msg as RawGmailMessage);
      }),
    };
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to list drafts: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const refreshGmailMessages = async (userId?: string) => {
  try {
    const tenant = getTenant(userId);

    // Sync both INBOX and SENT labels
    const labelsToSync = ["INBOX", "SENT"];
    const seenIds = new Set<string>();

    for (const label of labelsToSync) {
      const listParams: GmailMessageListParams = {
        maxResults: 50,
        labelIds: [label],
      };
      const listRes = await tenant.gmail.api.messages.list(listParams);
      const items = (listRes && typeof listRes === "object" && "messages" in listRes) ? (listRes.messages ?? []) : [];
      for (const item of items) {
        if (item?.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          const fetched = await tenant.gmail.api.messages.get({ id: item.id });
          const data = (fetched && typeof fetched === "object" && "data" in fetched && fetched.data)
            ? fetched.data
            : fetched;
          if (data) {
            const upsertData = {
              ...data,
              id: item.id,
            } as Parameters<typeof tenant.gmail.db.messages.upsertByEntityId>[1];
            await tenant.gmail.db.messages.upsertByEntityId(item.id, upsertData);
          }
        }
      }
    }

    // Sync drafts
    try {
      const draftsRes = await tenant.gmail.api.drafts.list({ maxResults: 20 });
      const draftsItems = (draftsRes && typeof draftsRes === "object" && "drafts" in draftsRes) ? (draftsRes.drafts ?? []) : [];
      for (const item of draftsItems) {
        if (item?.id) {
          const fetched = await tenant.gmail.api.drafts.get({ id: item.id });
          const data = (fetched && typeof fetched === "object" && "data" in fetched && fetched.data)
            ? fetched.data
            : fetched;
          if (data) {
            const msgData = data as unknown as { message?: { id?: string }; id?: string };
            const upsertDraft = {
              id: item.id,
              messageId: msgData.message?.id ?? msgData.id,
            } as Parameters<typeof tenant.gmail.db.drafts.upsertByEntityId>[1];
            await tenant.gmail.db.drafts.upsertByEntityId(item.id, upsertDraft);
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[Sync] Drafts sync skipped/failed: ${message}`);
    }
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to refresh: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const trashGmailMessage = async (messageId: string, userId?: string) => {
  try {
    const tenant = getTenant(userId);
    await tenant.gmail.api.messages.trash({ id: messageId });
    return { success: true };
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to trash message: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
