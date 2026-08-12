import { Router } from "express";
import * as registrationsController from "../controllers/registrations.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(requireAuth);

router.get("/me", authorize("student"), registrationsController.listMyRegistrations);
router.get("/", authorize("manager"), registrationsController.listAllRegistrations);
router.post("/", authorize("student"), registrationsController.registerForCourse);
router.delete("/:id", registrationsController.cancelRegistration);

export default router;
