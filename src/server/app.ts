import express from "express";
import cors from "cors";
import { healthRoute } from "./health/health.route";
import { gmailRoute } from "./gmail/route";
import { calendarRoute } from "./calendar/route";
import { commandRoute } from "./command/route";
import { webhookRoute } from "./webhooks/route";
import { authRoute } from "./better-auth/route";
import { requestLogger } from "./middleware/request-logger";
import { errorHandler } from "./middleware/error-handler";
import { requireAuth } from "./middleware/auth";

export const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);

app.use("/api/auth", authRoute);

app.use("/api/health", healthRoute);
app.use("/api/gmail", requireAuth, gmailRoute);
app.use("/api/calendar", requireAuth, calendarRoute);
app.use("/api/command", requireAuth, commandRoute);
app.use("/api/webhooks", webhookRoute);

app.use(errorHandler);
