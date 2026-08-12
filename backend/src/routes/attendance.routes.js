import { Router } from "express";
import * as attendanceController from "../controllers/attendance.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(requireAuth);

router.get("/me", authorize("student"), attendanceController.myAttendance);
router.get("/overview", authorize("manager"), attendanceController.attendanceOverview);
router.get("/room/:roomId", authorize("teacher", "manager"), attendanceController.attendanceForRoom);
router.post(
  "/room/:roomId/finalize",
  authorize("teacher", "manager"),
  attendanceController.finalizeRoomAttendance
);

export default router;
