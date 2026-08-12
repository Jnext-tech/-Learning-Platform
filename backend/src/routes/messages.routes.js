import { Router } from "express";
import * as messagesController from "../controllers/messages.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/room/:roomId", messagesController.listMessages);
router.post("/room/:roomId", messagesController.sendMessage);

export default router;
