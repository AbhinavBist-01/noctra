import { Router } from "express";
import { processWebhook, verifyWebhook } from "./service";

export const webhookRoute = Router();

webhookRoute.post("/gmail", async (req, res, next) => {
  try {
    const result = await processWebhook(req.body);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

webhookRoute.post("/calendar", async (req, res, next) => {
  try {
    const result = await processWebhook(req.body);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

webhookRoute.get("/verify", async (req, res, next) => {
  try {
    const result = await verifyWebhook(req.query);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});
