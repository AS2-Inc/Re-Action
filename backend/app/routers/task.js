import express from "express";
import token_checker from "../middleware/token_checker.js";
import { upload } from "../middleware/upload.js";
import * as TaskController from "../controllers/task_controller.js";

const router = express.Router();

// GET /api/v1/tasks (Get Tasks for Logged-in User)
router.get("", token_checker, TaskController.get_user_tasks);

// POST /api/v1/tasks/submit
router.post(
  "/submit",
  token_checker,
  upload.single("photo"),
  TaskController.submit_task,
);

// POST /api/v1/tasks/create (Create Task - Operators only)
router.post("/create", token_checker, TaskController.create_task);

// POST /api/v1/tasks/submissions
router.post("/submissions", token_checker, TaskController.get_submissions);

// POST /api/v1/tasks/submissions/:id/verify
router.post(
  "/submissions/:id/verify",
  token_checker,
  TaskController.verify_submission,
);

export default router;
