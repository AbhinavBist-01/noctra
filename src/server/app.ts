import express from "express";
import cors from "cors";
import { healthRoute } from "./health/health.route";
import { gmailRoute } from "./gmail/route";
import { calendarRoute } from "./calendar/route";
export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoute);
app.use("/api/gmail", gmailRoute);
app.use("/api/calendar", calendarRoute);
