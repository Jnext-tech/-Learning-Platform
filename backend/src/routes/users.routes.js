import { Router } from "express";
import * as usersController from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(requireAuth);

router.get("/", authorize("manager"), usersController.listUsers);
router.patch("/:id/role", authorize("manager"), usersController.updateUserRole);
router.get("/:id", usersController.getUserById);

export default router;
