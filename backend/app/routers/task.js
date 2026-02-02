import express from "express";
import token_checker from "../middleware/token_checker.js";
import { upload } from "../middleware/upload.js"; // Import upload middleware
import * as TaskService from "../services/task_service.js";

const router = express.Router();

// GET /api/v1/tasks (Get Tasks for Logged-in User)
router.get("", token_checker, async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.logged_user.role !== "citizen") {
    return res.status(403).json({ error: "Unauthorized: Citizens only" });
  }

  try {
    const tasks = await TaskService.get_user_tasks(req.logged_user.id);
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/**
 * POST /api/v1/tasks/submit
 * User submits a task.
 * Supports multipart/form-data for photo uploads.
 */
router.post("/submit", token_checker, upload.single("photo"), async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.logged_user.role !== "citizen") {
    return res.status(403).json({ error: "Unauthorized: Citizens only" });
  }

  try {
    const task_id = req.body.task_id;
    let proof = {};

    // Handle Proof data
    // If it's multipart/form-data, non-file fields are in req.body
    if (req.body.proof) {
      // Try parsing if it came as a JSON string (common in some clients sending multipart)
      try {
        proof = typeof req.body.proof === 'string' ? JSON.parse(req.body.proof) : req.body.proof;
      } catch (e) {
        proof = req.body.proof;
      }
    }

    // Attach photo if present
    if (req.file) {
      proof.photo_url = `/uploads/${req.file.filename}`;
    }

    const result = await TaskService.submit_task(
      req.logged_user.id,
      task_id,
      proof,
    );
    res.status(200).json(result);
  } catch (error) {
    // If validation fails
    if (
      error.message === "Verification failed" ||
      //   error.message === "Task not assigned or expired" || // Let general catch handle these?
      //   error.message === "Task already completed or pending approval" ||
      //   error.message === "Task is in cooldown" ||
      error.message.includes("Distance") ||
      error.message.includes("QR Code") ||
      error.message.includes("Quiz") ||
      error.message.includes("Photo") ||
      error.message.includes("Missing")
    ) {
      return res.status(400).json({ error: error.message });
    } else if (error.message === "Task not found" || error.message === "Quiz not found") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error submitting task:", error);
    res.status(500).json({ error: "Failed to submit task: " + error.message });
  }
});

// --- OPERATOR ROUTES ---

// POST /api/v1/tasks/create (Create Task - Operators only)
router.post("/create", token_checker, async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized: Operators only" });
  }
  // TODO: add validation
  try {
    const task = await TaskService.create_task(req.body);
    res.location(`/api/v1/tasks/${task.id}`).status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

/**
 * POST /api/v1/tasks/submissions
 * @param {string} status - Filter by status (pending, approved, rejected)
 * Operators view pending tasks
 */
router.post("/submissions", token_checker, async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const filter = {};
  if (req.body?.status) filter.status = req.body.status;

  try {
    const submissions = await TaskService.get_submissions(filter);
    res.status(200).json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

/**
 * POST /api/v1/tasks/submissions/:id/verify
 * Operator approves or rejects a manual submission
 */
router.post("/submissions/:id/verify", token_checker, async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!req.body.verdict) {
    return res.status(400).json({ error: "Verdict required" });
  }

  try {
    const result = await TaskService.verify_submission(
      req.params.id,
      req.body.verdict,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "Submission not found") {
      return res.status(404).json({ error: error.message });
    } else if (
      error.message === "Submission is already processed" ||
      error.message.includes("Invalid verdict")
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error verifying submission:", error);
    res.status(500).json({ error: "Failed to verify submission" });
  }
});

export default router;
