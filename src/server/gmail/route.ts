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
} from "@/shared/gmail";
import { summarizeEmail } from "./summarize";
import { validate } from "../lib/validation";

export const gmailRoute = Router();

gmailRoute.get("/messages", async (req, res) => {
  const query = validate(ListGmailMessagesQuerySchema, req.query);
  const result = await getGmailMessages({
    query: query.query,
    limit: query.limit ?? 20,
    cursor: query.cursor,
  });
  res.status(200).json({ data: result });
});

gmailRoute.get("/messages/:messageId", async (req, res) => {
  const { messageId } = validate(GetGmailMessageParamsSchema, req.params);
  const result = await getGmailMessageById(messageId);
  res.status(200).json({ data: result });
});

gmailRoute.post("/drafts", async (req, res) => {
  const body = validate(CreateGmailDraftRequestSchema, req.body);
  const result = await createGmailDraft(body);
  res.status(200).json({ data: result });
});

gmailRoute.post("/drafts/:draftId/send", async (req, res) => {
  const { draftId } = validate(SendGmailDraftParamsSchema, req.params);
  const result = await sendGmailDraft(draftId);
  res.status(200).json({ data: result });
});

gmailRoute.post("/send", async (req, res) => {
  const body = validate(SendGmailMessageRequestSchema, req.body);
  const result = await sendGmailMessage(body);

  res.status(200).json({ data: result });
});

gmailRoute.get("/drafts", async (_req, res) => {
  const result = await getGmailDrafts();
  res.status(200).json({ data: result });
});

gmailRoute.post("/messages/:messageId/trash", async (req, res) => {
  const { messageId } = req.params;
  if (!messageId) {
    res.status(400).json({ error: "messageId required" });
    return;
  }
  const result = await trashGmailMessage(messageId);
  res.status(200).json({ data: result });
});

gmailRoute.post("/summarize", async (req, res) => {
  const { messageId } = req.body as { messageId: string };
  if (!messageId) {
    res.status(400).json({ error: "messageId required" });
    return;
  }
  const message = await getGmailMessageById(messageId);
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  const summary = await summarizeEmail(message);
  res.status(200).json({ data: { summary } });
});

gmailRoute.post("/refresh", async (_req, res, next) => {
  try {
    await refreshGmailMessages();
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});
