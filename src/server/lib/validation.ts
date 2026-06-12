import { ZodError, type ZodSchema } from "zod";

export const validate = <T>(schema: ZodSchema<T>, value: unknown): T => {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.issues.map((issue) => issue.message).join(", "));
    }

    throw error;
  }
};
