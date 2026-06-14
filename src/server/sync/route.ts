import { Router } from "express";
import { setupUserSync } from "./service";

export const syncRoute = Router();

syncRoute.post("/setup", async (req, res, next) => {
  try {
    const session = req.session;
    if (!session) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const result = await setupUserSync(session.user.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});
