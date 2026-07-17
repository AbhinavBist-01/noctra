import { Router } from "express";
import {
  getGmailMessages,
  getGmailMessageById,
  createGmailDraft,
  sendGmailDraft,
  refreshGmailMessages,
  sendGmailMessage,
  getGmailDrafts,
  trashGmailMessage,
} from "./service";
import {
  CreateGmailDraftRequestSchema,
  GetGmailMessageParamsSchema,
  ListGmailMessagesQuerySchema,
  SendGmailDraftParamsSchema,
  SendGmailMessageRequestSchema,
  SummarizeEmailRequestSchema,
  SummarizeBatchEmailRequestSchema,
} from "@/shared/gmail";
import { summarizeEmail, summarizeEmailsBatch } from "./summarize";
import { validate } from "../lib/validation";

export const gmailRoute = Router();

gmailRoute.get("/messages", async (req, res, next) => {
  try {
    const query = validate(ListGmailMessagesQuerySchema, req.query);
    const result = await getGmailMessages({
      query: query.query,
      limit: query.limit ?? 20,
      cursor: query.cursor,
    });
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

gmailRoute.get("/messages/:messageId", async (req, res, next) => {
  try {
    const { messageId } = validate(GetGmailMessageParamsSchema, req.params);
    const result = await getGmailMessageById(messageId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

gmailRoute.post("/drafts", async (req, res, next) => {
  try {
    const body = validate(CreateGmailDraftRequestSchema, req.body);
    const result = await createGmailDraft(body);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

gmailRoute.post("/drafts/:draftId/send", async (req, res, next) => {
  try {
    const { draftId } = validate(SendGmailDraftParamsSchema, req.params);
    const result = await sendGmailDraft(draftId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

gmailRoute.post("/send", async (req, res, next) => {
  try {
    const body = validate(SendGmailMessageRequestSchema, req.body);
    const result = await sendGmailMessage(body);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

gmailRoute.get("/drafts", async (_req, res, next) => {
  try {
    const result = await getGmailDrafts();
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

gmailRoute.post("/messages/:messageId/trash", async (req, res, next) => {
  try {
    const { messageId } = validate(GetGmailMessageParamsSchema, req.params);
    const result = await trashGmailMessage(messageId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

gmailRoute.post("/summarize", async (req, res, next) => {
  try {
    const { messageId } = validate(SummarizeEmailRequestSchema, req.body);
    const message = await getGmailMessageById(messageId);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    const summary = await summarizeEmail(message);
    res.status(200).json({ data: { summary } });
  } catch (error) {
    next(error);
  }
});

gmailRoute.post("/summarize-batch", async (req, res, next) => {
  try {
    const { limit } = validate(SummarizeBatchEmailRequestSchema, req.body);
    const batchLimit = limit ?? 5;

    // Fetch the latest emails
    const result = await getGmailMessages({ limit: batchLimit });
    const messageSummaries = result.messages;

    // Fetch details for each message to get the bodies
    const messagesWithDetails = await Promise.all(
      messageSummaries.map(async (m) => {
        try {
          const detail = await getGmailMessageById(m.id);
          return detail || m;
        } catch {
          return m;
        }
      })
    );

    const summary = await summarizeEmailsBatch(messagesWithDetails);
    res.status(200).json({ data: { summary } });
  } catch (error) {
    next(error);
  }
});

gmailRoute.get("/debug/raw", async (_req, res, next) => {
  try {
    const tenant = (await import("../corsair/tenant")).getTenant();
    const raw = await tenant.gmail.api.messages.list({ maxResults: 2 });
    const items = (raw && typeof raw === "object" && "messages" in raw) ? (raw.messages ?? []) : [];
    const debug = await Promise.all(
      items.slice(0, 2).map(async (m) => {
        const id = m.id;
        if (!id) return { raw: m, fetched: null };
        try {
          const fetched = await tenant.gmail.api.messages.get({ id });
          const data = (fetched && typeof fetched === "object" && "data" in fetched && fetched.data)
            ? fetched.data
            : fetched;
          return { raw: m, fetched: data };
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          return { raw: m, fetched: null, error: message };
        }
      })
    );
    res.status(200).json({ data: { rawList: raw, items: debug } });
  } catch (error) {
    next(error);
  }
});

gmailRoute.post("/refresh", async (_req, res, next) => {
  try {
    await refreshGmailMessages();
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});
