import express from "express";
import token_checker from "../middleware/token_checker.js";
import { upload } from "../middleware/upload.js";
import * as TaskController from "../controllers/task_controller.js";
import check_role from "../middleware/role_checker.js";

const router = express.Router();

// GET /api/v1/tasks (Get Tasks for Logged-in User)
router.get(
  "",
  token_checker,
  check_role(["citizen"]),
  TaskController.get_user_tasks,
);

// GET /api/v1/tasks/active (Get Active Tasks for Logged-in User)
router.get(
  "/active",
  token_checker,
  check_role(["citizen"]),
  TaskController.get_active_tasks,
);

// GET /api/v1/tasks/:id (Get Task by ID)
router.get("/:id", token_checker, TaskController.get_task);

// POST /api/v1/tasks/submit
router.post(
  "/submit",
  token_checker,
  check_role(["citizen"]),
  upload.single("photo"),
  TaskController.submit_task,
);

// POST /api/v1/tasks/create (Create Task - Operators only)
router.post(
  "/create",
  token_checker,
  check_role(["operator"]),
  TaskController.create_task,
);

// POST /api/v1/tasks/submissions
router.post(
  "/submissions",
  token_checker,
  check_role(["operator"]),
  TaskController.get_submissions,
);

// POST /api/v1/tasks/submissions/:id/verify
router.post(
  "/submissions/:id/verify",
  token_checker,
  check_role(["operator"]),
  TaskController.verify_submission,
);

export default router;
