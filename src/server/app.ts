import express from "express";
import cors from "cors";
import { healthRoute } from "./health/health.route";
import { gmailRoute } from "./gmail/route";
import { calendarRoute } from "./calendar/route";
import { commandRoute } from "./command/route";
import { webhookRoute } from "./webhooks/route";
import { requestLogger } from "./middleware/request-logger";
import { errorHandler } from "./middleware/error-handler";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/health", healthRoute);
app.use("/api/gmail", gmailRoute);
app.use("/api/calendar", calendarRoute);
app.use("/api/command", commandRoute);
app.use("/api/webhooks", webhookRoute);

app.use(errorHandler);
