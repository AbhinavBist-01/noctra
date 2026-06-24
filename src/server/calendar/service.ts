import type { CreateCalendarInviteRequest } from "@/shared/calendar";

import { getTenant } from "../corsair/tenant";
import { mapCalendarEventSummary } from "./mapper";
import { AppError } from "../lib/app-error";

export const getCalendarEvents = async (input: {
  query?: string;
  weekStart?: string;
  weekEnd?: string;
}) => {
  try {
    const tenant = getTenant();

    const params: Record<string, any> = {};
    if (input.weekStart) params.timeMin = input.weekStart;
    if (input.weekEnd) params.timeMax = input.weekEnd;
    if (input.query) params.q = input.query;

    const raw = await tenant.googlecalendar.api.events.getMany(params as any);
    const list = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
    return {
      events: list.map((e: any) => mapCalendarEventSummary(e.data ?? e)),
    };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to list events: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const draftCalendarEvent = async (
  input: CreateCalendarInviteRequest,
) => {
  return { draft: input };
};

export const refreshCalendarEvents = async () => {
  try {
    const tenant = getTenant();
    await tenant.googlecalendar.api.events.getMany({ maxResults: 50 } as any);
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to refresh calendar: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const createCalendarInvite = async (
  input: CreateCalendarInviteRequest,
) => {
  try {
    const tenant = getTenant();

    const params = {
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

export const deleteCalendarEvent = async (eventId: string) => {
  try {
    const tenant = getTenant();
    await tenant.googlecalendar.api.events.delete({
      calendarId: "primary",
      eventId,
    } as any);
    return { success: true };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to delete event: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
