import express from "express";
import cors from "cors";
import { healthRoute } from "./health/health.route";
import { gmailRoute } from "./gmail/route";
import { calendarRoute } from "./calendar/route";
import { commandRoute } from "./command/route";
import { webhookRoute, webhookAdminRoute } from "./webhooks/route";
import { syncRoute } from "./sync/route";
import { authRoute } from "./better-auth/route";
import { requestLogger } from "./middleware/request-logger";
import { errorHandler } from "./middleware/error-handler";
import { requireAuth } from "./middleware/auth";

export const app = express();

app.use(express.json());
app.use(requestLogger);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

const browserCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((o) => origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
});

app.use("/api/auth", browserCors, authRoute);

app.use("/api/health", browserCors, healthRoute);
app.use("/api/gmail", browserCors, requireAuth, gmailRoute);
app.use("/api/calendar", browserCors, requireAuth, calendarRoute);
app.use("/api/command", browserCors, requireAuth, commandRoute);
app.use("/api/sync", browserCors, requireAuth, syncRoute);
app.use("/api/webhooks/admin", browserCors, requireAuth, webhookAdminRoute);

app.use("/api/webhooks", webhookRoute);

app.use(errorHandler);
