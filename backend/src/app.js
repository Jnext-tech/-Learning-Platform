import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import coursesRoutes from "./routes/courses.routes.js";
import registrationsRoutes from "./routes/registrations.routes.js";
import roomsRoutes from "./routes/rooms.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import activityLogsRoutes from "./routes/activityLogs.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/courses", coursesRoutes);
app.use("/registrations", registrationsRoutes);
app.use("/rooms", roomsRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/activity-logs", activityLogsRoutes);
app.use("/messages", messagesRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
