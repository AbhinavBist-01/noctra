import type { GmailMessageDetail, GmailMessageSummary } from "@/shared/gmail";
import { classifyGmailPriority } from "./priority";

type GmailHeader = {
  name?: string;
  value?: string;
};

export type RawGmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string | number;
  from?: string;
  to?: string | string[];
  subject?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType?: string;
      body?: {
        data?: string;
      };
      parts?: Array<unknown>;
    }>;
  };
};

const getHeaderValue = (message: RawGmailMessage, headerName: string) => {
  const headers = message.payload?.headers ?? [];
  return headers.find(
    (header) => header.name?.toLowerCase() === headerName.toLowerCase(),
  )?.value;
};

const getFrom = (message: RawGmailMessage): string | undefined => {
  if (message.from) return message.from;
  return getHeaderValue(message, "from");
};

const getSubject = (message: RawGmailMessage): string | undefined => {
  if (message.subject) return message.subject;
  return getHeaderValue(message, "subject");
};

const getTo = (message: RawGmailMessage): string[] | undefined => {
  if (message.to) {
    if (Array.isArray(message.to)) return message.to;
    return message.to.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const headerVal = getHeaderValue(message, "to");
  if (headerVal) {
    return headerVal.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
};

const decodeBase64Url = (value?: string) => {
  if (!value) return undefined;
  try {
    return Buffer.from(
      value.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
  } catch {
    return undefined;
  }
};

/**
 * Decodes HTML entities into clean readable text characters.
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");
}

/**
 * Converts raw HTML string into clean formatted plain text.
 */
function cleanHtmlBody(html: string): string {
  if (!html) return "";
  const cleaned = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h1|h2|h3|h4|h5|h6|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");

  const decoded = decodeHtmlEntities(cleaned);
  return decoded
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

/**
 * Recursively searches Gmail message parts for text/plain or text/html body.
 */
function findPart(parts?: GmailPart[], mimeType?: string): string | undefined {
  if (!parts || !Array.isArray(parts)) return undefined;

  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (decoded) return decoded;
    }
    if (part.parts && part.parts.length > 0) {
      const nested = findPart(part.parts, mimeType);
      if (nested) return nested;
    }
  }
  return undefined;
}

const getBody = (message: RawGmailMessage): string | undefined => {
  // 1. Direct payload body
  const directData = message.payload?.body?.data;
  if (directData) {
    const decoded = decodeBase64Url(directData);
    if (decoded) return cleanHtmlBody(decoded);
  }

  // 2. Search parts recursively for text/plain
  const plainText = findPart(message.payload?.parts as GmailPart[], "text/plain");
  if (plainText) {
    return cleanHtmlBody(plainText);
  }

  // 3. Fallback: Search parts recursively for text/html
  const htmlText = findPart(message.payload?.parts as GmailPart[], "text/html");
  if (htmlText) {
    return cleanHtmlBody(htmlText);
  }

  // 4. Fallback snippet
  return message.snippet ? cleanHtmlBody(message.snippet) : undefined;
};

const getReceivedAt = (message: RawGmailMessage) => {
  if (!message.internalDate) return undefined;

  return new Date(Number(message.internalDate)).toISOString();
};

export const mapGmailMessageSummary = (
  message: RawGmailMessage,
): GmailMessageSummary => {
  const from = getFrom(message);
  const subject = getSubject(message);
  const snippet = message.snippet ? decodeHtmlEntities(message.snippet) : undefined;

  return {
    id: message.id ?? "",
    threadId: message.threadId,
    from,
    to: getTo(message),
    subject,
    snippet,
    receivedAt: getReceivedAt(message),
    labels: message.labelIds,
    priority: classifyGmailPriority({
      from,
      subject,
      snippet,
      labels: message.labelIds,
    }),
  };
};

export const mapGmailMessageDetail = (
  message: RawGmailMessage,
): GmailMessageDetail => {
  return {
    ...mapGmailMessageSummary(message),
    body: getBody(message),
  };
};
