import type { ApiErrorCode } from "@/shared/api";

export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}
