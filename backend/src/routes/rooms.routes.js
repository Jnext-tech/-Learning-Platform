import { Router } from "express";
import * as roomsController from "../controllers/rooms.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(requireAuth);

router.get("/", roomsController.listRooms);
router.get("/:id", roomsController.getRoom);
router.get("/:id/access-check", roomsController.checkRoomAccess);
router.post("/", authorize("manager", "teacher"), roomsController.createRoom);
router.put("/:id", authorize("manager", "teacher"), roomsController.updateRoom);
router.post("/:id/end", authorize("manager", "teacher"), roomsController.endRoom);

export default router;
