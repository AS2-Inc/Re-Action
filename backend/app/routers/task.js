import express from "express";
import * as TaskController from "../controllers/task_controller.js";
import ServiceError from "../errors/service_error.js";
import check_role from "../middleware/role_checker.js";
import token_checker from "../middleware/token_checker.js";
import { upload } from "../middleware/upload.js";
import task_template_service from "../services/task_template_service.js";

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

// GET /api/v1/tasks/all (Get All Tasks - Operators only)
router.get(
  "/all",
  token_checker,
  check_role(["operator"]),
  TaskController.get_all_tasks,
);

// PUT /api/v1/tasks/:id (Update Task - Operators only)
router.put(
  "/:id",
  token_checker,
  check_role(["operator"]),
  TaskController.update_task,
);

// DELETE /api/v1/tasks/:id (Delete Task - Operators only)
router.delete(
  "/:id",
  token_checker,
  check_role(["operator"]),
  TaskController.delete_task,
);

// ============================================
// Task Template Endpoints (RF11)
// ============================================

/**
 * GET /api/v1/tasks/templates
 * Get all available task templates (operators only)
 */
router.get(
  "/templates",
  token_checker,
  check_role(["operator", "admin"]),
  async (_req, res) => {
    try {
      const templates = await task_template_service.get_templates();
      res.status(200).json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  },
);

/**
 * GET /api/v1/tasks/templates/:id
 * Get a specific template by ID
 */
router.get(
  "/templates/:id",
  token_checker,
  check_role(["operator", "admin"]),
  async (req, res) => {
    try {
      const template = await task_template_service.get_template(req.params.id);
      res.status(200).json(template);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Get template error:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  },
);

/**
 * POST /api/v1/tasks/from-template
 * Create a new task from a template (operators only)
 */
router.post(
  "/from-template",
  token_checker,
  check_role(["operator", "admin"]),
  async (req, res) => {
    try {
      const { template_id, ...task_data } = req.body;

      if (!template_id) {
        return res.status(400).json({ error: "template_id is required" });
      }

      if (!task_data.title || !task_data.description) {
        return res
          .status(400)
          .json({ error: "title and description are required" });
      }

      const task = await task_template_service.create_task_from_template(
        template_id,
        task_data,
        req.logged_user.id,
      );

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Create from template error:", error);
      res.status(500).json({ error: "Failed to create task from template" });
    }
  },
);

// GET /api/v1/tasks/:id (Get Task by ID) - MOVED HERE TO AVOID COLLISION
router.get("/:id", token_checker, TaskController.get_task);

export default router;
