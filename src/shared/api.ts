export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CORSAIR_ERROR"
  | "COMMAND_PARSE_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccessResponse<T> = {
  data: T;
};
