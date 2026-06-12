import type { CalendarAttendee, CalendarEventSummary } from "@/shared/calendar";

type RawCalendarAttendee = {
  email?: string;
  displayName?: string;
  name?: string;
};

type RawCalendarEvent = {
  id?: string;
  summary?: string;
  title?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: string | { dateTime?: string; date?: string };
  end?: string | { dateTime?: string; date?: string };
  attendees?: RawCalendarAttendee[];
};

const getDateValue = (
  value?: string | { dateTime?: string; date?: string },
): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.dateTime ?? value.date ?? "";
};

const mapAttendees = (
  attendees?: RawCalendarAttendee[],
): CalendarAttendee[] | undefined => {
  if (!attendees) return undefined;

  return attendees
    .map((attendee) => ({
      email: attendee.email ?? "",
      name: attendee.displayName ?? attendee.name,
    }))
    .filter((attendee) => attendee.email);
};

export const mapCalendarEventSummary = (
  event: RawCalendarEvent,
): CalendarEventSummary => {
  return {
    id: event.id ?? "",
    title: event.summary ?? event.title ?? "Untitled event",
    description: event.description,
    location: event.location,
    start: getDateValue(event.start),
    end: getDateValue(event.end),
    attendees: mapAttendees(event.attendees),
  };
};
