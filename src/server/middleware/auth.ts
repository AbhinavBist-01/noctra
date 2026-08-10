import type { Request, Response, NextFunction } from "express";
import { auth } from "../better-auth/auth";
import { fromNodeHeaders } from "better-auth/node";
import { AppError } from "../lib/app-error";
import { ensureUserSync } from "../sync/service";

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
    const headers = fromNodeHeaders(req.headers);
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new AppError("VALIDATION_ERROR", "Unauthorized — sign in required");
    }

    req.session = session;

    // Automatically ensure DEKs & OAuth tokens are provisioned for this user
    await ensureUserSync(session.user.id);

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("VALIDATION_ERROR", "Unauthorized — invalid session"));
    }
  }
};
