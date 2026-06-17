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

const browserCors = cors({
  origin: "http://localhost:3000",
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
