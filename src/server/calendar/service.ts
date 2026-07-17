import type { CreateCalendarInviteRequest } from "@/shared/calendar";

import { getTenant } from "../corsair/tenant";
import { mapCalendarEventSummary } from "./mapper";
import { AppError } from "../lib/app-error";
import { telemetryService } from "../telemetry/service";

export const getCalendarEvents = async (input: {
  query?: string;
  weekStart?: string;
  weekEnd?: string;
}) => {
  const startTime = Date.now();
  try {
    const tenant = getTenant();

    const params: Record<string, any> = {};
    if (input.weekStart) params.timeMin = input.weekStart;
    if (input.weekEnd) params.timeMax = input.weekEnd;
    if (input.query) params.q = input.query;

    const raw = await tenant.googlecalendar.api.events.getMany(params as any);
    const list = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];

    const duration = Date.now() - startTime;
    telemetryService.recordToolCall("code_exec", duration); // Calendar API calls
    telemetryService.recordActivity(
      "CalendarService",
      `Fetched ${list.length} events from calendar`,
      "done",
      duration
    );

    return {
      events: list.map((e: any) => mapCalendarEventSummary(e.data ?? e)),
    };
  } catch (error: any) {
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
  const startTime = Date.now();
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

    const duration = Date.now() - startTime;
    telemetryService.recordToolCall("code_exec", duration); // Calendar API calls
    telemetryService.recordActivity(
      "CalendarService",
      `Created calendar invite: "${input.title}"`,
      "done",
      duration
    );

    return event;
  } catch (error: any) {
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
      id: eventId,
    } as any);
    return { success: true };
  } catch (error) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to delete event: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
