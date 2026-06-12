import type { GmailMessageDetail, GmailMessageSummary } from "@/shared/gmail";

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

const getHeader = (message: RawGmailMessage, headerName: string) => {
  const headers = message.payload?.headers ?? [];

  return headers.find(
    (header) => header.name?.toLowerCase() === headerName.toLowerCase(),
  )?.value;
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
  return {
    id: message.id ?? "",
    threadId: message.threadId,
    from: getHeader(message, "from"),
    to: getHeader(message, "to")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    subject: getHeader(message, "subject"),
    snippet: message.snippet,
    receivedAt: getReceivedAt(message),
    labels: message.labelIds,
    priority: "normal",
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
