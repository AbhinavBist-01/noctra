import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const authHandler = toNodeHandler(auth);

export const authRoute = Router();

authRoute.use((req, res, next) => {
  authHandler(req as any, res as any).catch(next);
});
