import type {
  CommandPreviewAction,
  EmailCommandAction,
  CalendarInviteCommandAction,
  CommandActionType,
} from "@/shared/command";
import type { CalendarAttendee } from "@/shared/calendar";

let actionCounter = 0;
const nextId = () => `action_${++actionCounter}`;

const emailPatterns = [
  /(?:send|draft|create)\s+(?:an\s+)?email\s+to\s+(.+?)(?:\s+with\s+subject\s+(.+?))?(?:\s+(?:and\s+)?(?:body|saying)\s+(.+))?$/i,
  /(?:send|draft|create)\s+(?:an\s+)?email\s+to\s+(.+?)(?:\s+saying\s+(.+))?$/i,
  /email\s+(.+?)(?:\s+subject\s+(.+?))?(?:\s+body\s+(.+))?$/i,
];

const calendarPatterns = [
  /(?:create|send|schedule)\s+(?:a\s+)?calendar\s+invite\s+for\s+(.+?)(?:\s+at\s+(.+?))?(?:\s+(?:on|at)\s+(.+))?$/i,
  /(?:create|send|schedule)\s+(?:a\s+)?calendar\s+invite\s+to\s+(.+?)(?:\s+at\s+(.+?))?(?:\s+titled\s+(.+?))?(?:\s+on\s+(.+))?$/i,
  /(?:create|schedule)\s+(?:an?\s+)?event\s+(?:titled\s+|called\s+)?(.+?)(?:\s+with\s+(.+?))?(?:\s+at\s+(.+))?$/i,
  /invite\s+(.+?)(?:\s+to\s+(.+?))?(?:\s+at\s+(.+))?$/i,
];

const referentialPattern = /^(?:also\s+)?(?:send|draft|create)\s+(?:him|her|them)\s+(?:an?\s+)?(email|invite)(?:\s+too(?:\s+(?:saying|with\s+body)\s+(.+))?)?(?:\s+(?:saying|with\s+body)\s+(.+))?$/i;

const extractEmails = (raw: string): string[] => {
  const emails = raw.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) return emails;

  const nameParts = raw.split(/,\s*|\s+and\s+/).map((s) => s.trim()).filter(Boolean);
  return nameParts.length > 0 ? nameParts : [raw.trim()];
};

const guessActionType = (text: string): "email_draft" | "email_send" => {
  if (/^draft\b/i.test(text.trim())) return "email_draft";
  return "email_send";
};

const parseDate = (text?: string): { start: string; end: string } => {
  const now = new Date();
  if (!text) {
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const lower = text.toLowerCase();

  if (lower.includes("next week")) {
    const day = 7 - now.getDay() + 1;
    const start = new Date(now);
    start.setDate(now.getDate() + day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const dayNames: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  for (const [name, dayIndex] of Object.entries(dayNames)) {
    if (lower.includes(name) || lower.includes(name.slice(0, 3))) {
      const isNext = lower.includes("next");
      const target = new Date(now);
      const currentDay = now.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0 || isNext) diff += 7;
      target.setDate(now.getDate() + diff);
      target.setHours(9, 0, 0, 0);
      const end = new Date(target.getTime() + 60 * 60 * 1000);
      return { start: target.toISOString(), end: end.toISOString() };
    }
  }

  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]!);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3]!.toLowerCase();
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    const start = new Date(now);
    start.setHours(hours, minutes, 0, 0);
    if (start <= now) start.setDate(start.getDate() + 1);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
};

const splitCommand = (command: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  const isEmailContext = (pos: number): boolean => {
    const before = command.slice(Math.max(0, pos - 30), pos);
    const after = command.slice(pos + 1, pos + 30);
    return /@\s*\w*$/.test(before) && /^\w+(\.\w+)*/.test(after);
  };

  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;

    if (char === "." && depth === 0 && !isEmailContext(i)) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());

  if (parts.length <= 1) {
    const separators = [
      /\.\s+(and\s+)?(send|draft|create|schedule|invite)/gi,
      /\,?\s+and\s+(send|draft|create|schedule|invite)/gi,
    ];
    for (const sep of separators) {
      const matches = command.split(sep);
      if (matches.length > 1) {
        return matches.map((s) => s.trim()).filter(Boolean);
      }
    }
  }

  return parts.length > 1 ? parts : [command];
};

const parseEmailAction = (text: string): EmailCommandAction | null => {
  for (const pattern of emailPatterns) {
    const match = text.match(pattern);
    if (match) {
      const rawTo = match[1] ?? "";
      const subject = match[2]?.trim();
      const body = match[3]?.trim();
      return {
        id: nextId(),
        type: guessActionType(text),
        to: extractEmails(rawTo),
        subject: subject ?? "No subject",
        body: body ?? "",
      };
    }
  }
  return null;
};

const parseCalendarAction = (text: string): CalendarInviteCommandAction | null => {
  for (const pattern of calendarPatterns) {
    const match = text.match(pattern);
    if (match) {
      const group1 = match[1]?.trim() ?? "";
      const group2 = match[2]?.trim();
      const group3 = match[3]?.trim();
      const group4 = match[4]?.trim();

      if (pattern.toString().includes("titled") || pattern.toString().includes("called")) {
        const title = group1;
        const rawAttendees = group2;
        const dateText = group3;
        const attendees: CalendarAttendee[] = rawAttendees
          ? extractEmails(rawAttendees).map((email) => ({ email }))
          : [];
        const { start, end } = parseDate(dateText || group2);
        return {
          id: nextId(),
          type: "calendar_invite",
          title,
          start,
          end,
          attendees,
        };
      }

      const emails = extractEmails(group1);
      const title = group2 ?? "Meeting";
      const dateText = group3 || group2;
      const { start, end } = parseDate(dateText);

      return {
        id: nextId(),
        type: "calendar_invite",
        title,
        start,
        end,
        attendees: emails.map((email) => ({ email })),
      };
    }
  }
  return null;
};

const parseReferentialAction = (
  text: string,
  previousActions: CommandPreviewAction[],
): CommandPreviewAction | null => {
  const match = text.match(referentialPattern);
  if (!match) return null;

  const actionType = match[1]?.toLowerCase();
  const body = (match[2] ?? match[3])?.trim();

  if (!actionType) return null;

  const lastEmailAction = [...previousActions]
    .reverse()
    .find((a) => a.type === "email_draft" || a.type === "email_send") as EmailCommandAction | undefined;

  const lastCalendarAction = [...previousActions]
    .reverse()
    .find((a) => a.type === "calendar_invite") as CalendarInviteCommandAction | undefined;

  if ((actionType === "email" || actionType === "an email") && lastCalendarAction) {
    return {
      id: nextId(),
      type: "email_send",
      to: lastCalendarAction.attendees.map((a) => a.email),
      subject: `Re: ${lastCalendarAction.title}`,
      body: body ?? "",
    };
  }

  if (actionType === "invite" && lastEmailAction) {
    return {
      id: nextId(),
      type: "calendar_invite",
      title: `Meeting with ${lastEmailAction.to.join(", ")}`,
      start: new Date(Date.now() + 3600000).toISOString(),
      end: new Date(Date.now() + 7200000).toISOString(),
      attendees: lastEmailAction.to.map((email) => ({ email })),
    };
  }

  return null;
};

export const parseCommand = (
  command: string,
): { actions: CommandPreviewAction[]; warnings: string[] } => {
  actionCounter = 0;
  const warnings: string[] = [];
  const actions: CommandPreviewAction[] = [];

  const parts = splitCommand(command);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const refAction = parseReferentialAction(trimmed, actions);
    if (refAction) {
      actions.push(refAction);
      continue;
    }

    const email = parseEmailAction(trimmed);
    if (email) {
      actions.push(email);
      continue;
    }

    const calendar = parseCalendarAction(trimmed);
    if (calendar) {
      actions.push(calendar);
      continue;
    }

    warnings.push(`Could not parse: "${trimmed}"`);
  }

  return { actions, warnings };
};
