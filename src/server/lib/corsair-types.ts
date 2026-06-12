export type GmailDraftCreateParams = {
  userId?: string;
  draft?: {
    message?: {
      raw?: string;
      threadId?: string;
    };
  };
};

export type GmailDraftSendParams = {
  userId?: string;
  id?: string;
  message?: {
    raw?: string;
    threadId?: string;
  };
};

export type GmailMessageSendParams = {
  userId?: string;
  raw: string;
  threadId?: string;
};

export type GmailThreadListParams = {
  userId?: string;
  q?: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
};

export type GmailDbSearchParams = {
  query?: string;
  limit?: number;
  offset?: number;
};

export type GmailDbListParams = {
  limit?: number;
  offset?: number;
};

export type CalendarEventCreateParams = {
  calendarId?: string;
  event: {
    summary?: string;
    description?: string;
    location?: string;
    start?: {
      date?: string;
      dateTime?: string;
      timeZone?: string;
    };
    end?: {
      date?: string;
      dateTime?: string;
      timeZone?: string;
    };
    attendees?: Array<{
      email?: string;
      displayName?: string;
    }>;
  };
};

export type CalendarEventGetManyParams = {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  timeZone?: string;
  q?: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: "startTime" | "updated";
};

export type CalendarDbSearchParams = {
  query?: string;
  weekStart?: string;
  weekEnd?: string;
};

export type CalendarDbListParams = {
  weekStart?: string;
  weekEnd?: string;
};
