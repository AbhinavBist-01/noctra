import type { Request, Response, NextFunction } from "express";
import { auth } from "../better-auth/auth";
import type { ApiErrorResponse } from "@/shared/api";
import { AppError } from "../lib/app-error";

declare global {
  namespace Express {
    interface Request {
      session?: {
        user: {
          id: string;
          email: string;
          name?: string;
        };
        session: {
          id: string;
        };
      };
    }
  }
}

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const headers = new Headers(req.headers as Record<string, string>);
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new AppError("VALIDATION_ERROR", "Unauthorized — sign in required");
    }

    req.session = session as Request["session"];
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("VALIDATION_ERROR", "Unauthorized — invalid session"));
    }
  }
};
