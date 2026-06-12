import { z } from "zod";

export const CalendarAttendeeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export const ListCalendarEventsQuerySchema = z.object({
  query: z.string().optional(),
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
});

export const CreateCalendarInviteRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  timezone: z.string().optional(),
  attendees: z.array(CalendarAttendeeSchema).min(1),
});

export type CalendarAttendee = {
  email: string;
  name?: string;
};

export type CalendarEventSummary = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees?: CalendarAttendee[];
};

export type ListCalendarEventsResponse = {
  events: CalendarEventSummary[];
};

export type CreateCalendarInviteRequest = {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  timezone?: string;
  attendees: CalendarAttendee[];
};

export type CreateCalendarInviteResponse = {
  eventId: string;
  htmlLink?: string;
};
