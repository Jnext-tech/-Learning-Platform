import { Router } from "express";
import * as activityLogsController from "../controllers/activityLogs.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(requireAuth);
router.get("/room/:roomId", authorize("teacher", "manager"), activityLogsController.activityForRoom);

export default router;
