import { Router } from "express";

import {
  CreateCalendarInviteRequestSchema,
  ListCalendarEventsQuerySchema,
} from "@/shared/calendar";

import { validate } from "../lib/validation";
import {
  createCalendarInvite,
  draftCalendarEvent,
  getCalendarEvents,
  refreshCalendarEvents,
} from "./service";

export const calendarRoute = Router();

calendarRoute.get("/events", async (req, res, next) => {
  try {
    const query = validate(ListCalendarEventsQuerySchema, req.query);
    const result = await getCalendarEvents({
      query: query.query,
      weekStart: query.weekStart,
      weekEnd: query.weekEnd,
    });

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

calendarRoute.post("/events/draft", async (req, res, next) => {
  try {
    const body = validate(CreateCalendarInviteRequestSchema, req.body);
    const result = await draftCalendarEvent(body);

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

calendarRoute.post("/refresh", async (_req, res, next) => {
  try {
    await refreshCalendarEvents();
    res.status(200).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

calendarRoute.post("/invites", async (req, res, next) => {
  try {
    const body = validate(CreateCalendarInviteRequestSchema, req.body);
    const result = await createCalendarInvite(body);

    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

// GET /invites — returns upcoming calendar events as invite references
calendarRoute.get("/invites", async (_req, res, next) => {
  try {
    const result = await getCalendarEvents({});
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});
