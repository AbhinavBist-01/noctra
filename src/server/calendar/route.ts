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
} from "./service";

export const calendarRoute = Router();

calendarRoute.get("/events", async (req, res) => {
  const query = validate(ListCalendarEventsQuerySchema, req.query);
  const result = await getCalendarEvents({
    query: query.query,
    weekStart: query.weekStart,
    weekEnd: query.weekEnd,
  });

  res.status(200).json({ data: result });
});

calendarRoute.post("/events/draft", async (req, res) => {
  const body = validate(CreateCalendarInviteRequestSchema, req.body);
  const result = await draftCalendarEvent(body);

  res.status(200).json({ data: result });
});

calendarRoute.post("/invites", async (req, res) => {
  const body = validate(CreateCalendarInviteRequestSchema, req.body);
  const result = await createCalendarInvite(body);

  res.status(201).json({ data: result });
});
