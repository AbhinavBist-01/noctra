import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

export const authHandler = toNodeHandler(auth);

export const authRoute = Router();

authRoute.use(async (req, res, next) => {
  try {
    await authHandler(req, res);
  } catch (error) {
    console.error("[BetterAuth Internal Error]", error);
    next(error);
  }
});
