import { ZodError, type ZodSchema } from "zod";
import { AppError } from "./app-error";

export const validate = <T>(schema: ZodSchema<T>, value: unknown): T => {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(
        "VALIDATION_ERROR",
        error.issues.map((issue) => issue.message).join(", "),
        error.issues,
      );
    }
    throw error;
  }
};
