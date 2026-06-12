import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ApiErrorResponse } from "@/shared/api";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(`[ERROR] ${err.message}`);

  if (err instanceof ZodError) {
    const body: ApiErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues.map((i) => i.message).join(", "),
        details: err.issues,
      },
    };
    res.status(400).json(body);
    return;
  }

  if (err.message.startsWith("CORSAIR")) {
    const body: ApiErrorResponse = {
      error: {
        code: "CORSAIR_ERROR",
        message: err.message,
      },
    };
    res.status(502).json(body);
    return;
  }

  const body: ApiErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  };
  res.status(500).json(body);
};
