import type { CreateCalendarInviteRequest } from "@/shared/calendar";

import { getTenant } from "../corsair/tenant";
import { mapCalendarEventSummary } from "./mapper";
import { AppError } from "../lib/app-error";
import type {
  CalendarDbSearchParams,
  CalendarDbListParams,
  CalendarEventCreateParams,
  CalendarEventGetManyParams,
} from "../lib/corsair-types";

export const getCalendarEvents = async (input: {
  query?: string;
  weekStart?: string;
  weekEnd?: string;
}) => {
  try {
    const tenant = getTenant();

    if (input.query) {
      const params: CalendarDbSearchParams = {
        query: input.query,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
      };
      const events = await tenant.googlecalendar.db.events.search(params as any);
      return {
        events: Array.isArray(events)
          ? events.map(mapCalendarEventSummary)
          : events,
      };
    }

    const params: CalendarDbListParams = {
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
    };
    const events = await tenant.googlecalendar.db.events.list(params as any);
    return {
      events: Array.isArray(events)
        ? events.map(mapCalendarEventSummary)
        : events,
    };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to list events: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const refreshCalendarEvents = async () => {
  try {
    const tenant = getTenant();
    const params: CalendarEventGetManyParams = {};
    await tenant.googlecalendar.api.events.getMany(params as any);
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to refresh events: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const draftCalendarEvent = async (
  input: CreateCalendarInviteRequest,
) => {
  return { draft: input };
};

export const createCalendarInvite = async (
  input: CreateCalendarInviteRequest,
) => {
  try {
    const tenant = getTenant();

    const params: CalendarEventCreateParams = {
      event: {
        summary: input.title,
        description: input.description,
        location: input.location,
        start: { dateTime: input.start, timeZone: input.timezone },
        end: { dateTime: input.end, timeZone: input.timezone },
        attendees: input.attendees.map((a) => ({
          email: a.email,
          displayName: a.name,
        })),
      },
    };
    const event = await tenant.googlecalendar.api.events.create(params as any);
    return event;
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to create invite: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
