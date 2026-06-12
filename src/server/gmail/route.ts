import { Router } from "express";
import {
  getGmailMessages,
  getGmailMessageById,
  createGmailDraft,
  sendGmailDraft,
  refreshGmailMessages,
  sendGmailMessage,
} from "./service";
export const gmailRoute = Router();

gmailRoute.get("/messages", async (req, res) => {
  const result = await getGmailMessages({
    query: typeof req.query.query === "string" ? req.query.query : undefined,
    limit: Number(req.query.limit ?? 20),
    offset: Number(req.query.offset ?? 0),
  });
  res.status(200).json({
    data: {
      messages: result,
    },
  });
});

gmailRoute.get("/messages/:id", async (req, res) => {
  const { id } = req.params;
  const result = await getGmailMessageById(id);
  res.status(200).json({
    data: {
      result,
    },
  });
});

gmailRoute.post("/drafts", async (req, res) => {
  const { to, subject, cc, bcc, body } = req.body;
  const result = await createGmailDraft({
    to,
    subject,
    cc,
    bcc,
    body: req.body.body,
  });
  res.status(200).json({
    data: {
      result,
    },
  });
});

gmailRoute.post("/drafts/:id/send", async (req, res) => {
  const { id } = req.params;
  const result = await sendGmailDraft(id);
  res.status(200).json({
    data: {
      result,
    },
  });
});

gmailRoute.post("/send", async (req, res) => {
  const { to, subject, cc, bcc, body } = req.body;
  const result = await sendGmailMessage({
    to,
    subject,
    cc,
    bcc,
    body,
  });

  res.status(200).json({
    data: {
      result,
    },
  });
});

gmailRoute.post("/refresh", async (req, res) => {
  await refreshGmailMessages();
  res.status(200).json({
    data: "success",
  });
});
