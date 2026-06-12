import { Router } from "express";

export const gmailRoute = Router();

gmailRoute.get("/messages", async (req, res) => {
  res.status(200).json({
    data: {
      messages: "This is the list of messages",
    },
  });
});

gmailRoute.get("/messages/:id", async (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    data: {
      message: `This is the message with id ${id}`,
    },
  });
});

gmailRoute.post("/drafts", async (req, res) => {
  res.status(200).json({
    data: {
      draft: "This is the created draft",
    },
  });
});

gmailRoute.post("/drafts/:id/send", async (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    data: {
      draft: `This is the sent draft with id ${id}`,
    },
  });
});

gmailRoute.post("/send", async (req, res) => {
  res.status(200).json({
    data: {
      message: "This is the sent message",
    },
  });
});
