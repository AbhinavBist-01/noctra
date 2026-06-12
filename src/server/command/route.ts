import { Router } from "express";
import { z } from "zod";
import { previewCommand, executeCommand } from "./service";
import type { CommandExecuteRequest } from "@/shared/command";

const PreviewRequestSchema = z.object({
  command: z.string().min(1),
});

const actionSchema = z.object({
  id: z.string(),
  type: z.enum(["email_draft", "email_send", "calendar_invite"]),
  to: z.array(z.string()).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  timezone: z.string().optional(),
  attendees: z
    .array(z.object({ email: z.string(), name: z.string().optional() }))
    .optional(),
});

const ExecuteRequestSchema = z.object({
  actions: z.array(actionSchema),
});

export const commandRoute = Router();

commandRoute.post("/preview", (req, res, next) => {
  try {
    const body = PreviewRequestSchema.parse(req.body);
    const result = previewCommand(body);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

commandRoute.post("/execute", async (req, res, next) => {
  try {
    const body = ExecuteRequestSchema.parse(req.body) as CommandExecuteRequest;
    const result = await executeCommand(body);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});
