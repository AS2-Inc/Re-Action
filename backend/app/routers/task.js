import express from "express";
import token_checker from "../middleware/token_checker.js";
import Neighborhood from "../models/neighborhood.js";
import Task from "../models/task.js";
import Activity from "../models/activity.js";
import User from "../models/user.js";

const router = express.Router();

import BadgeService from "../services/badgeService.js";

// Helper Function: Awards points and checks for badge achievements
async function award_points(user_id, task_id) {
  const user = await User.findById(user_id);
  const task = await Task.findById(task_id);

  if (!user || !task) return { success: false, newBadges: [] };

  // TODO: prevent awarding points multiple times for the same task

  user.points += task.base_points;

  // Update Ambient Stats
  if (task.impact_metrics) {
    user.ambient.co2_saved += task.impact_metrics.co2_saved || 0;
    user.ambient.waste_recycled += task.impact_metrics.waste_recycled || 0;
    user.ambient.km_green += task.impact_metrics.distance || 0;
  }

  // Level Update Logic
  // TODO: Move this to a centralized service or config if it gets complex
  if (user.points >= 5000) user.level = "King della Sostenibilità";
  else if (user.points >= 1000) user.level = "Eroe Locale";
  else if (user.points >= 500) user.level = "Cittadino Attivo";
  else if (user.points >= 100) user.level = "Nuovo Arrivato";
  else user.level = "Cittadino Base";

  await user.save();

  if (user.neighborhood_id) {
    const neighborhood = await Neighborhood.findById(user.neighborhood_id);
    if (neighborhood) {
      neighborhood.total_score += task.base_points;
      await neighborhood.save();
    }
  }

  // Event Driven Badge Checks
  const pointsBadges = await BadgeService.onPointsUpdated(user);
  const taskBadges = await BadgeService.onTaskCompleted(user, task);

  const newBadges = [...pointsBadges, ...taskBadges];

  return { success: true, newBadges };
}

// GET /api/v1/tasks (Get Tasks for Logged-in User)
router.get("", token_checker, async (req, res) => {
  // check if the user is logged in
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fetch tasks available for the user's neighborhood
  const user = await User.findById(req.logged_user.id).populate("neighborhood");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // get the tasks for the user's neighborhood or global tasks or user task
  // Exclude expired tasks (RF6)
  const tasks = await Task.find({
    $and: [
      {
        $or: [
          { neighborhood_id: user.neighborhood_id },
          { neighborhood_id: null },
          { user_id: user._id },
        ],
      },
      {
        $or: [{ expired: false }, { expired: { $exists: false } }],
      },
      { is_active: true },
    ],
  });

  res.status(200).json(tasks);
});

// POST /api/v1/tasks/create (Create Task - Operators only)
router.post("/create", token_checker, async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
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
router.post("/:id/submit", token_checker, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  // Check for existing submissions and recurrence
  const last_activity = await Activity.findOne({
    user_id: req.logged_user.id,
    task_id: task._id,
    status: { $in: ["APPROVED", "PENDING"] },
  }).sort({ completed_at: -1 });

  if (last_activity) {
    if (!task.repeatable) {
      return res
        .status(400)
        .json({ error: "Task already completed or pending approval" });
    } else {
      const now = new Date();
      const cooldown_ms = (task.cooldown_hours || 24) * 60 * 60 * 1000;
      const time_since_last = now - new Date(last_activity.submitted_at);
      if (time_since_last < cooldown_ms) {
        return res.status(400).json({ error: "Task is in cooldown" });
      }
    }
  }

  // 1. Create the submission record
  const submission = new Activity({
    user_id: req.logged_user.id,
    task_id: task._id,
    status: "PENDING",
    proof: req.body.proof, // Expecting { gps_location: ... } or { qr_code: ... }
  });

  // 2. Logic based on Verification Method
  if (task.verification_method === "MANUAL_REPORT") {
    // CASE A: Manual - Needs Operator Verification
    await submission.save();
    return res.status(200).json({
      submission_status: "PENDING",
    });
  } else {
    // CASE B: Automatic (GPS or QR) - Server Verification
    let is_valid = false;

    if (task.verification_method === "GPS") {
      // TODO: Implement distance check here
      // For now, we simulate valid coordinates
      if (req.body.evidence?.gps_location) {
        is_valid = true;
      }
    } else if (task.verification_method === "QR_SCAN") {
      // TODO: Validate QR string matches expected value
      if (req.body.evidence?.qr_code_data) {
        is_valid = true;
      }
    }

    if (is_valid) {
      submission.status = "APPROVED";
      submission.completed_at = new Date();
      await submission.save();
      const { newBadges } = await award_points(req.logged_user.id, task._id);

      return res.status(200).json({
        points_earned: task.base_points,
        submission_status: "APPROVED",
        new_badges: newBadges,
      });
    } else {
      submission.status = "REJECTED";
      await submission.save();
      return res.status(400).json({
        submission_status: "REJECTED",
      });
    }
  }
});

// --- OPERATOR ROUTES ---

/**
 * GET /api/v1/tasks/submissions?status=pending
 * Operators view pending tasks
 */
router.get("/submissions", token_checker, async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  // Populate user and task details so operator can see who and what
  const submissions = await Activity.find(filter)
    .populate("user_id", "name surname email")
    .populate("task_id", "title description points verification_method");

  res.status(200).json(submissions);
});

/**
 * POST /api/v1/tasks/submissions/:id/verify
 * Operator approves or rejects a manual submission
 * Body: { "verdict": "approved" } or { "verdict": "rejected" }
 */
router.post("/submissions/:id/verify", token_checker, async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const submission = await Activity.findById(req.params.id);
  if (!submission)
    return res.status(404).json({ error: "Submission not found" });

  if (submission.status !== "PENDING") {
    return res.status(400).json({ error: "Submission is already processed" });
  }

  const verdict = req.body.verdict.toLowerCase(); // 'APPROVED' or 'REJECTED'
  if (verdict === "approved") {
    submission.status = "APPROVED";
    submission.completed_at = new Date();
    await submission.save();

    // Award the points now that the operator confirmed
    const { newBadges } = await award_points(
      submission.user_id,
      submission.task_id,
    );

    return res.status(200).json({
      new_badges: newBadges,
    });
  } else if (verdict === "rejected") {
    submission.status = "REJECTED";
    await submission.save();
    return res.status(200).json({});
  } else {
    return res
      .status(400)
      .json({ error: "Invalid verdict. Use 'approved' or 'rejected'." });
  }
});

export default router;
