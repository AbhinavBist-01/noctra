import type { CreateCalendarInviteRequest } from "@/shared/calendar";

import { getTenant } from "../corsair/tenant";
import { mapCalendarEventSummary, type RawCalendarEvent } from "./mapper";
import { AppError } from "../lib/app-error";
import { telemetryService } from "../telemetry/service";
import type { CalendarEventGetManyParams, CalendarEventCreateParams } from "../lib/corsair-types";

export const getCalendarEvents = async (input: {
  query?: string;
  weekStart?: string;
  weekEnd?: string;
  userId?: string;
}) => {
  const startTime = Date.now();

  const fetchEvents = async () => {
    const tenant = getTenant(input.userId);
    const params: CalendarEventGetManyParams = {};
    if (input.weekStart) params.timeMin = input.weekStart;
    if (input.weekEnd) params.timeMax = input.weekEnd;
    if (input.query) params.q = input.query;
    return tenant.googlecalendar.api.events.getMany(params);
  };

  try {
    let raw;
    try {
      raw = await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if ((msg.includes("Unauthorized") || msg.includes("401")) && input.userId) {
        console.log(`[CalendarService] Token unauthorized for ${input.userId}, running token re-sync...`);
        const { setupUserSync } = await import("../sync/service");
        await setupUserSync(input.userId);
        raw = await fetchEvents();
      } else {
        throw err;
      }
    }

    const list = Array.isArray(raw) ? raw : raw?.items ?? [];

    const duration = Date.now() - startTime;
    telemetryService.recordToolCall("code_exec", duration); // Calendar API calls
    telemetryService.recordActivity(
      "CalendarService",
      `Fetched ${list.length} events from calendar`,
      "done",
      duration
    );

    return {
      events: list.map((e) => {
        const rawEvent = (e && typeof e === "object" && "data" in e && e.data)
          ? (e.data as RawCalendarEvent)
          : (e as RawCalendarEvent);
        return mapCalendarEventSummary(rawEvent);
      }),
    };
  } catch (error: unknown) {
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

export const refreshCalendarEvents = async (userId?: string) => {
  try {
    const tenant = getTenant(userId);
    await tenant.googlecalendar.api.events.getMany({ maxResults: 50 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if ((msg.includes("Unauthorized") || msg.includes("401")) && userId) {
      console.log(`[CalendarService] Token unauthorized during refresh for ${userId}, re-syncing...`);
      const { setupUserSync } = await import("../sync/service");
      await setupUserSync(userId);
      const tenant = getTenant(userId);
      await tenant.googlecalendar.api.events.getMany({ maxResults: 50 });
    } else {
      throw new AppError(
        "CORSAIR_ERROR",
        `Failed to refresh calendar: ${msg}`,
      );
    }
  }
};

export const createCalendarInvite = async (
  input: CreateCalendarInviteRequest,
  userId?: string,
) => {
  const startTime = Date.now();
  try {
    const tenant = getTenant(userId);

    const params: CalendarEventCreateParams = {
      event: {
        summary: input.title,
        description: input.description || undefined,
        location: input.location || undefined,
        start: { dateTime: input.start, timeZone: input.timezone },
        end: { dateTime: input.end, timeZone: input.timezone },
        attendees: input.attendees.map((a) => ({
          email: a.email,
          displayName: a.name || undefined,
        })),
      },
    };
    const event = await tenant.googlecalendar.api.events.create(params);

    const duration = Date.now() - startTime;
    telemetryService.recordToolCall("code_exec", duration); // Calendar API calls
    telemetryService.recordActivity(
      "CalendarService",
      `Created calendar invite: "${input.title}"`,
      "done",
      duration
    );

    return event;
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to create invite: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const deleteCalendarEvent = async (eventId: string, userId?: string) => {
  try {
    const tenant = getTenant(userId);
    await tenant.googlecalendar.api.events.delete({
      calendarId: "primary",
      id: eventId,
    });
    return { success: true };
  } catch (error: unknown) {
    throw new AppError(
      "CORSAIR_ERROR",
      `Failed to delete event: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
