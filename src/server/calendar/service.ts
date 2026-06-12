import type { CreateCalendarInviteRequest } from "@/shared/calendar";

import { getTenant } from "../corsair/tenant";
import { mapCalendarEventSummary } from "./mapper";

export const getCalendarEvents = async (input: {
  query?: string;
  weekStart?: string;
  weekEnd?: string;
}) => {
  const tenant = getTenant();

  if (input.query) {
    const events = await tenant.googlecalendar.db.events.search({
      query: input.query,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
    } as any);

    return {
      events: Array.isArray(events) ? events.map(mapCalendarEventSummary) : events,
    };
  }

  const events = await tenant.googlecalendar.db.events.list({
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
  } as any);

  return {
    events: Array.isArray(events) ? events.map(mapCalendarEventSummary) : events,
  };
};

export const refreshCalendarEvents = async () => {
  const tenant = getTenant();
  await tenant.googlecalendar.api.events.getMany({} as any);
};

export const draftCalendarEvent = async (
  input: CreateCalendarInviteRequest,
) => {
  return {
    draft: input,
  };
};

export const createCalendarInvite = async (
  input: CreateCalendarInviteRequest,
) => {
  const tenant = getTenant();

  const event = await tenant.googlecalendar.api.events.create({
    title: input.title,
    description: input.description,
    location: input.location,
    start: input.start,
    end: input.end,
    timezone: input.timezone,
    attendees: input.attendees,
  } as any);

  return event;
};
