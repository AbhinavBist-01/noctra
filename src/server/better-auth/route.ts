import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

export const authRoute = Router();

const authHandler = toNodeHandler(auth);

authRoute.all("/{*path}", (req, res, next) => {
  authHandler(req as any, res as any).catch(next);
});
