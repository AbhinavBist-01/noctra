import { Router } from "express";
import { processWebhook, verifyWebhook, getWebhookLog } from "./service";

export const webhookRoute = Router();
export const webhookAdminRoute = Router();

// Admin endpoint for viewing webhook activity (requires auth, applied in app.ts)
webhookAdminRoute.get("/log", async (_req, res) => {
  const log = getWebhookLog(50);
  res.status(200).json({ data: { entries: log } });
});

// Webhook receivers (public — for Pub/Sub and external services)
webhookRoute.post("/gmail", async (req, res, next) => {
  try {
    const result = await processWebhook(
      req.headers as Record<string, string | string[] | undefined>,
      req.body,
      req.query as Record<string, string | string[] | undefined>,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

webhookRoute.post("/calendar", async (req, res, next) => {
  try {
    const result = await processWebhook(
      req.headers as Record<string, string | string[] | undefined>,
      req.body,
      req.query as Record<string, string | string[] | undefined>,
    );
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


