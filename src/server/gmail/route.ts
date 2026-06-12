import { Router } from "express";
import {
  getGmailMessages,
  getGmailMessageById,
  createGmailDraft,
  sendGmailDraft,
  refreshGmailMessages,
  sendGmailMessage,
} from "./service";
import {
  CreateGmailDraftRequestSchema,
  GetGmailMessageParamsSchema,
  ListGmailMessagesQuerySchema,
  SendGmailDraftParamsSchema,
  SendGmailMessageRequestSchema,
} from "@/shared/gmail";
import { validate } from "../lib/validation";

export const gmailRoute = Router();

gmailRoute.get("/messages", async (req, res) => {
  const query = validate(ListGmailMessagesQuerySchema, req.query);
  const result = await getGmailMessages({
    query: query.query,
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
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

gmailRoute.post("/refresh", async (_req, res) => {
  await refreshGmailMessages();
  res.status(200).json({
    data: { success: true },
  });
});
