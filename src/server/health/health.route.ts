import { Router } from "express";

export const healthRoute = Router();

healthRoute.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});
