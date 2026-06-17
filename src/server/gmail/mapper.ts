import type { GmailMessageDetail, GmailMessageSummary } from "@/shared/gmail";
import { classifyGmailPriority } from "./priority";

type GmailHeader = {
  name?: string;
  value?: string;
};

type RawGmailMessage = {
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

  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
};

const getBody = (message: RawGmailMessage) => {
  const directBody = decodeBase64Url(message.payload?.body?.data);

  if (directBody) return directBody;

  const plainTextPart = message.payload?.parts?.find(
    (part) => part.mimeType === "text/plain",
  );

  return decodeBase64Url(plainTextPart?.body?.data);
};

const getReceivedAt = (message: RawGmailMessage) => {
  if (!message.internalDate) return undefined;

  return new Date(Number(message.internalDate)).toISOString();
};

export const mapGmailMessageSummary = (
  message: RawGmailMessage,
): GmailMessageSummary => {
  if (!(globalThis as any).__gmailMapperDebug) {
    (globalThis as any).__gmailMapperDebug = true;
    console.log("[DEBUG MAPPER] message keys:", Object.keys(message));
    console.log("[DEBUG MAPPER] message:", JSON.stringify(message, null, 2)?.slice(0, 800));
  }

  const from = getFrom(message);
  const subject = getSubject(message);
  const snippet = message.snippet;

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
