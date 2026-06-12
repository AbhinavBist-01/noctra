import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ApiErrorResponse } from "@/shared/api";
import { AppError } from "../lib/app-error";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(`[ERROR] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    const status = err.code === "VALIDATION_ERROR" ? 400
      : err.code === "NOT_FOUND" ? 404
      : err.code === "CORSAIR_ERROR" ? 502
      : 500;
    res.status(status).json(body);
    return;
  }

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

  const body: ApiErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  };
  res.status(500).json(body);
};
