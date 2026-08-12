import { Router } from "express";
import * as coursesController from "../controllers/courses.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.use(requireAuth);

router.get("/", coursesController.listCourses);
router.get("/:id", coursesController.getCourse);
router.get("/:id/students", authorize("teacher", "manager"), coursesController.getCourseStudents);
router.post("/", authorize("manager", "teacher"), coursesController.createCourse);
router.put("/:id", authorize("manager", "teacher"), coursesController.updateCourse);
router.delete("/:id", authorize("manager", "teacher"), coursesController.deleteCourse);

export default router;
