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
