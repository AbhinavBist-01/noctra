import { Router } from "express";
import { previewCommand, executeCommand } from "./service";
import { PreviewRequestSchema, ExecuteRequestSchema } from "@/shared/command";
import type { CommandExecuteRequest } from "@/shared/command";

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
