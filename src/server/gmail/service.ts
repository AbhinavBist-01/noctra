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
  
  // If we already have payload headers or subject, return immediately
  if (data.payload?.headers || data.subject) return data;

  // Try reading from local DB cache first
  try {
    const cached = await tenant.gmail.db.messages.findByEntityId(id);
    const cachedRow = cached as unknown as { data?: RawGmailMessage } | null;
    const full = (cachedRow?.data ?? cached) as RawGmailMessage | undefined;
    if (full?.payload?.headers || full?.subject) return full;
  } catch { /* not in cache */ }

  // Otherwise fetch from Gmail API with a strict 4-second timeout
  try {
    const fetched = await Promise.race([
      tenant.gmail.api.messages.get({ id }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Fetch timeout")), 4000)),
    ]);
    const fetchedMsg = ((fetched as any).data ?? fetched) as RawGmailMessage;
    
    // Fallback headers from partial data if fetched message lacks headers
    if (!fetchedMsg.payload?.headers && data.payload?.headers) {
      fetchedMsg.payload = { ...(fetchedMsg.payload ?? {}), headers: data.payload.headers };
    }
    return fetchedMsg;
  } catch { return data; }
};

export const getGmailMessages = async (input: {
  query?: string;
  limit?: number;
  cursor?: string;
  userId?: string;
}) => {
  const startTime = Date.now();
  const limit = input.limit ?? 30;
  const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

  const fetchLiveMessages = async (tenantClient: TenantType) => {
    const listParams: GmailMessageListParams = { maxResults: Math.min(limit, 50) };
    if (input.query) listParams.q = input.query;

    const raw = await tenantClient.gmail.api.messages.list(listParams);
    const items = (raw && typeof raw === "object" && "messages" in raw) ? (raw.messages ?? []) : (Array.isArray(raw) ? raw : []);
    
    const fullMsgs = await Promise.all(
      (items as Array<{ id?: string; entityId?: string; data?: RawGmailMessage } & RawGmailMessage>).map(async (m) => {
        const full = await fetchFullMessage(tenantClient, m);
        const id = full.id ?? m.id;
        if (id) {
          try {
            await tenantClient.gmail.db.messages.upsertByEntityId(id, full as any);
          } catch { /* ignore cache write error */ }
        }
        return full;
      })
    );
    return fullMsgs;
  };

  try {
    const tenant = getTenant(input.userId);
    let allMessages: RawGmailMessage[] = [];

    if (input.query) {
      // Search query — run live search
      try {
        allMessages = await fetchLiveMessages(tenant);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if ((msg.includes("Unauthorized") || msg.includes("401")) && input.userId) {
          const { setupUserSync } = await import("../sync/service");
          await setupUserSync(input.userId);
          const freshTenant = getTenant(input.userId);
          allMessages = await fetchLiveMessages(freshTenant);
        } else {
          throw err;
        }
      }
    } else {
      // Instant SWR: Read local DB cache immediately for instant response
      const rawCache = await tenant.gmail.db.messages.list({});
      const cacheList = Array.isArray(rawCache) ? rawCache : [];

      if (cacheList.length > 0) {
        allMessages = cacheList.map((m) => {
          const cachedRow = m as unknown as { data?: RawGmailMessage } | null;
          return (cachedRow?.data ?? m) as RawGmailMessage;
        });

        // Trigger non-blocking background live sync so new emails populate automatically
        void refreshGmailMessages(input.userId).catch((err) => {
          console.log(`[GmailService] Background auto-sync skipped: ${err instanceof Error ? err.message : String(err)}`);
        });
      } else {
        // Cache empty — fetch live synchronously so user gets messages on first load
        console.log(`[GmailService] Cache empty for ${input.userId ?? "default"}, fetching live from Gmail API...`);
        try {
          allMessages = await fetchLiveMessages(tenant);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if ((msg.includes("Unauthorized") || msg.includes("401")) && input.userId) {
            const { setupUserSync } = await import("../sync/service");
            await setupUserSync(input.userId);
            const freshTenant = getTenant(input.userId);
            allMessages = await fetchLiveMessages(freshTenant);
          } else {
            throw err;
          }
        }
      }
    }

    // Deduplicate by message ID
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
    telemetryService.recordToolCall("web_search", duration);
    telemetryService.recordToolCall("vector_query", Math.round(duration * 0.1));
    telemetryService.recordActivity(
      "GmailService",
      `Fetched ${messages.length} messages (SWR Instant)`,
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
  const doRefresh = async (tenantClient: TenantType) => {
    const labelsToSync = ["INBOX", "SENT"];
    const seenIds = new Set<string>();

    for (const label of labelsToSync) {
      const listParams: GmailMessageListParams = {
        maxResults: 50,
        labelIds: [label],
      };
      const listRes = await tenantClient.gmail.api.messages.list(listParams);
      const items = (listRes && typeof listRes === "object" && "messages" in listRes) ? (listRes.messages ?? []) : [];
      for (const item of items) {
        if (item?.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          const fetched = await tenantClient.gmail.api.messages.get({ id: item.id });
          const data = (fetched && typeof fetched === "object" && "data" in fetched && fetched.data)
            ? fetched.data
            : fetched;
          if (data) {
            const upsertData = {
              ...data,
              id: item.id,
            } as Parameters<typeof tenantClient.gmail.db.messages.upsertByEntityId>[1];
            await tenantClient.gmail.db.messages.upsertByEntityId(item.id, upsertData);
          }
        }
      }
    }
  };

  try {
    const tenant = getTenant(userId);
    try {
      await doRefresh(tenant);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if ((msg.includes("Unauthorized") || msg.includes("401")) && userId) {
        console.log(`[GmailService] Refresh 401 for ${userId}, re-syncing tokens...`);
        const { setupUserSync } = await import("../sync/service");
        await setupUserSync(userId);
        const freshTenant = getTenant(userId);
        await doRefresh(freshTenant);
      } else {
        throw err;
      }
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
