import express from "express";
import Neighborhood from "../models/neighborhood.js";
import Task from "../models/task.js";
import TaskSubmission from "../models/taskSubmission.js";
import User from "../models/user.js";
import tokenChecker from "../tokenChecker.js";

const router = express.Router();

// Helper Function: Awards points (Refactored to be reusable)
async function awardPoints(userId, taskId) {
  const user = await User.findById(userId);
  const task = await Task.findById(taskId);

  if (!user || !task) return false;

  // TODO: prevent awarding points multiple times for the same task

  user.points += task.points;

  // Add to history if not already there
  user.tasks_completed.push(task._id);
  await user.save();

  if (user.neighborhood) {
    const neighborhood = await Neighborhood.findById(user.neighborhood);
    if (neighborhood) {
      // TODO: make the scoring system more complex later
      neighborhood.total_score += task.points;
      await neighborhood.save();
    }
  }
  return true;
}

// GET /api/v1/tasks (Get Tasks for Logged-in User)
router.get("", tokenChecker, async (req, res) => {
  // check if the user is logged in
  if (!req.loggedUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fetch tasks available for the user's neighborhood
  const user = await User.find
    .findById(req.loggedUser.id)
    .populate("neighborhood");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const neighborhoodId = user.neighborhood ? user.neighborhood._id : null;

  const tasks = await Task.find({
    $or: [
      { neighborhood: neighborhoodId },
      { neighborhood: null }, // Global tasks
    ],
  });

  res.status(200).json(tasks);
});

// POST /api/v1/tasks/create (Create Task - Operators only)
router.post("/create", tokenChecker, async (req, res) => {
  if (req.loggedUser.role !== "operator" && req.loggedUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized: Operators only" });
  }
  const task = new Task(req.body);
  await task.save();
  res.location(`/api/v1/tasks/${task.id}`).status(201).json(task);
});

/**
 * POST /api/v1/tasks/:id/submit
 * User submits a task.
 * - If Manual: Goes to "pending".
 * - If GPS/QR: Verified immediately by Server.
 */
router.post("/:id/submit", tokenChecker, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  // 1. Create the submission record
  const submission = new TaskSubmission({
    user: req.loggedUser.id,
    task: task._id,
    status: "pending",
    evidence: req.body.evidence, // Expecting { gps_location: ... } or { qr_code: ... }
  });

  // 2. Logic based on Verification Method
  if (task.verification_method === "manual") {
    // CASE A: Manual - Needs Operator Verification
    await submission.save();
    return res.status(200).json({
      submission_status: "pending",
    });
  } else {
    // CASE B: Automatic (GPS or QR) - Server Verification
    let isValid = false;

    if (task.verification_method === "gps") {
      // TODO: Implement distance check here
      // For now, we simulate valid coordinates
      if (req.body.evidence?.gps_location) {
        isValid = true;
      }
    } else if (task.verification_method === "qr") {
      // TODO: Validate QR string matches expected value
      if (req.body.evidence?.qr_code_data) {
        isValid = true;
      }
    }

    if (isValid) {
      submission.status = "approved";
      await submission.save();
      await awardPoints(req.loggedUser.id, task._id);

      return res.status(200).json({
        points_earned: task.points,
        submission_status: "approved",
      });
    } else {
      submission.status = "rejected";
      await submission.save();
      return res.status(400).json({
        submission_status: "rejected",
      });
    }
  }
});

// --- OPERATOR ROUTES ---

/**
 * GET /api/v1/tasks/submissions?status=pending
 * Operators view pending tasks
 */
router.get("/submissions", tokenChecker, async (req, res) => {
  if (req.loggedUser.role !== "operator" && req.loggedUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  // Populate user and task details so operator can see who and what
  const submissions = await TaskSubmission.find(filter)
    .populate("user", "name surname email")
    .populate("task", "title description points verification_method");

  res.status(200).json(submissions);
});

/**
 * POST /api/v1/tasks/submissions/:id/verify
 * Operator approves or rejects a manual submission
 * Body: { "verdict": "approved" } or { "verdict": "rejected" }
 */
router.post("/submissions/:id/verify", tokenChecker, async (req, res) => {
  if (req.loggedUser.role !== "operator" && req.loggedUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const submission = await TaskSubmission.findById(req.params.id);
  if (!submission)
    return res.status(404).json({ error: "Submission not found" });

  if (submission.status !== "pending") {
    return res.status(400).json({ error: "Submission is already processed" });
  }

  const verdict = req.body.verdict; // 'approved' or 'rejected'

  if (verdict === "approved") {
    submission.status = "approved";
    await submission.save();

    // Award the points now that the operator confirmed
    await awardPoints(submission.user, submission.task);

    return res.status(200).json({});
  } else if (verdict === "rejected") {
    submission.status = "rejected";
    await submission.save();
    return res.status(200).json({});
  } else {
    return res
      .status(400)
      .json({ error: "Invalid verdict. Use 'approved' or 'rejected'." });
  }
});

export default router;
