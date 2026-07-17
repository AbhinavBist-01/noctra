import { Router } from "express";
import { telemetryService } from "./service";

export const telemetryRoute = Router();

telemetryRoute.get("/", async (req, res, next) => {
  try {
    const data = await telemetryService.getTelemetryData();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
});
