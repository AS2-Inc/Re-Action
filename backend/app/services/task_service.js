import ServiceError from "../errors/service_error.js";
import Neighborhood from "../models/neighborhood.js";
import Submission from "../models/submission.js";
import Task from "../models/task.js";
import User from "../models/user.js";
import UserTask from "../models/user_task.js";
import BadgeService from "./badge_service.js";
import * as GPSVerifier from "./verification/gps_verifier.js";
import * as PhotoVerifier from "./verification/photo_verifier.js";
import * as QRVerifier from "./verification/qr_verifier.js";
import * as QuizVerifier from "./verification/quiz_verifier.js";

// Helper to award points and check badges
// (Moving logic from route to service)
export const award_points = async (user_id, task_id) => {
  const user = await User.findById(user_id);
  const task = await Task.findById(task_id);

  if (!user || !task) return { success: false, new_badges: [] };

  // Streak Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last_activity = user.last_activity_date
    ? new Date(user.last_activity_date)
    : null;
  if (last_activity) last_activity.setHours(0, 0, 0, 0);

  let multiplier = 1.0;

  if (!last_activity) {
    // First ever activity
    user.streak = 1;
  } else {
    const diff_time = Math.abs(today - last_activity);
    const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

    if (diff_days === 1) {
      // Consecutive day
      user.streak += 1;
    } else if (diff_days > 1) {
      // Missed a day (or more)
      user.streak = 1;
    }
    // If diff_days === 0, do nothing (same day)
  }
  user.last_activity_date = new Date();

  // Multiplier Logic
  if (user.streak > 30) multiplier = 1.5;
  else if (user.streak > 7) multiplier = 1.25;
  else if (user.streak > 3) multiplier = 1.1;

  const points_to_award = Math.round(task.base_points * multiplier);
  user.points += points_to_award;

  if (task.impact_metrics) {
    user.ambient.co2_saved += task.impact_metrics.co2_saved || 0;
    user.ambient.waste_recycled += task.impact_metrics.waste_recycled || 0;
    user.ambient.km_green += task.impact_metrics.distance || 0;
  }

  // Level Logic (Moved to BadgeService)
  BadgeService.check_level_up(user);

  await user.save();

  if (user.neighborhood_id) {
    const neighborhood = await Neighborhood.findById(user.neighborhood_id);
    if (neighborhood) {
      neighborhood.total_score += points_to_award;

      // Automatic Contribution to Active Goal (RF4 Enhancement)
      const active_goal = neighborhood.active_goals.find(
        (g) => !g.is_completed,
      );
      if (active_goal) {
        active_goal.current_points += points_to_award;
        if (active_goal.current_points >= active_goal.target_points) {
          active_goal.is_completed = true;
        }
      }

      await neighborhood.save();
    }
  }

  const new_badges = await BadgeService.checkAndAwardBadges(user.id);

  return { success: true, new_badges, points_awarded: points_to_award };
};

/**
 * Main entry point to get tasks for a user.
 * Ensures daily/weekly/monthly Rotation.
 */
export const get_user_tasks = async (user_id) => {
  const user = await User.findById(user_id);
  if (!user) throw new ServiceError("User not found", 404);
  const now = new Date();

  // 1. Get On-Demand & Onetime Tasks (Static)
  // Filter by Neighborhood OR Global
  const on_demand_tasks = await Task.find({
    frequency: { $in: ["on_demand", "onetime"] },
    is_active: true,
    $or: [{ neighborhood_id: user.neighborhood_id }, { neighborhood_id: null }],
  });

  // 2. Manage Rotating Tasks (Daily, Weekly, Monthly)
  const frequencies = ["daily", "weekly", "monthly"];

  // ... (rest of logic same until random assignment) ...
  // Note: I need to update the random assignment caller to pass user object or ID to look up neighborhood

  // Rewrite: Get ALL active assignments for user
  const current_assignments = await UserTask.find({
    user_id: user_id,
    status: { $in: ["ASSIGNED", "COMPLETED"] },
  }).populate("task_id");

  const assignments_by_freq = {
    daily: null,
    weekly: null,
    monthly: null,
  };

  for (const work_item of current_assignments) {
    if (!work_item.task_id) continue;
    const freq = work_item.task_id.frequency;

    // Check expiration
    if (work_item.status !== "EXPIRED" && work_item.expires_at < now) {
      work_item.status = "EXPIRED";
      await work_item.save();
      continue; // It's expired, slot is open
    }

    // If still valid
    if (frequencies.includes(freq)) {
      if (
        !assignments_by_freq[freq] ||
        assignments_by_freq[freq].expires_at < work_item.expires_at
      ) {
        assignments_by_freq[freq] = work_item;
      }
    }
  }

  // 3. Fill gaps
  const new_assignments = [];

  for (const freq of frequencies) {
    if (!assignments_by_freq[freq]) {
      // Need new task
      const task = await assign_random_task(user, freq);
      if (task) {
        // Determine expiration
        let expires_at = new Date();
        if (freq === "daily") {
          expires_at.setUTCHours(23, 59, 59, 999);
        } else if (freq === "weekly") {
          const d = new Date();
          d.setDate(d.getDate() + 7);
          expires_at = d;
        } else if (freq === "monthly") {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          expires_at = d;
        }

        const user_task = new UserTask({
          user_id: user_id,
          task_id: task._id,
          status: "ASSIGNED",
          expires_at: expires_at,
        });
        await user_task.save();

        user_task.task_id = task;
        new_assignments.push(user_task);
      }
    } else {
      new_assignments.push(assignments_by_freq[freq]);
    }
  }

  // 4. Format Output
  const result = [];

  // Add Rotating
  for (const item of new_assignments) {
    const t = item.task_id.toObject();
    t.assignment_status = item.status;
    t.assignment_id = item._id;
    t.expires_at = item.expires_at;
    result.push(t);
  }

  // Add On-Demand
  for (const t of on_demand_tasks) {
    const obj = t.toObject();
    obj.assignment_status = "AVAILABLE";
    result.push(obj);
  }

  return result;
};

export const assign_random_task = async (user, frequency) => {
  const query = {
    frequency: frequency,
    is_active: true,
    $or: [{ neighborhood_id: null }, { neighborhood_id: user.neighborhood_id }],
  };

  const count = await Task.countDocuments(query);
  if (count === 0) return null;

  const random = Math.floor(Math.random() * count);
  const task = await Task.findOne(query).skip(random);
  return task;
};

export const submit_task = async (user_id, task_id, proof) => {
  const task = await Task.findById(task_id);
  if (!task) throw new ServiceError("Task not found", 404);

  // Frequency-based completion limits
  const last_approved = await Submission.findOne({
    user_id,
    task_id,
    status: "APPROVED",
  }).sort({ completed_at: -1 });

  if (last_approved) {
    if (task.frequency === "onetime") {
      // Onetime tasks can only be done once
      throw new ServiceError("Task already completed", 400);
    }

    // on_demand tasks are unlimited — skip check
    if (task.frequency !== "on_demand") {
      const now = new Date();
      const last = new Date(last_approved.completed_at);
      let already_done = false;

      if (task.frequency === "daily") {
        // Same calendar day
        already_done = now.toDateString() === last.toDateString();
      } else if (task.frequency === "weekly") {
        // Within last 7 days
        const diff_days = (now - last) / (1000 * 60 * 60 * 24);
        already_done = diff_days < 7;
      } else if (task.frequency === "monthly") {
        // Same calendar month
        already_done =
          now.getFullYear() === last.getFullYear() &&
          now.getMonth() === last.getMonth();
      }

      if (already_done) {
        throw new ServiceError("Task already completed for this period", 400);
      }
    }
  }

  // Update UserTask if it exists (for rotating tasks)
  let user_task = null;
  if (task.frequency !== "on_demand" && task.frequency !== "onetime") {
    user_task = await UserTask.findOne({
      user_id: user_id,
      task_id: task_id,
      status: "ASSIGNED",
    });
    if (!user_task) throw new ServiceError("Task not assigned or expired", 400);
  }

  // 1. Verify
  let status = "PENDING";

  if (task.verification_method === "GPS") {
    // GPS Verification
    const result = GPSVerifier.verify(task, proof);
    status = result.status;
  } else if (task.verification_method === "QR_SCAN") {
    // QR Code Verification
    const result = QRVerifier.verify(task, proof);
    status = result.status;
  } else if (task.verification_method === "PHOTO_UPLOAD") {
    // Photo Verification - Manual Approval
    const result = PhotoVerifier.verify(task, proof);
    status = result.status;
  } else if (task.verification_method === "QUIZ") {
    // Quiz Verification
    const result = await QuizVerifier.verify(task, proof);
    status = result.status;
    if (result.enriched_proof) {
      proof = result.enriched_proof;
    }
  } else if (task.verification_method === "MANUAL_REPORT") {
    status = "PENDING";
    is_valid = true; // Tentatively valid until operator rejects
  }

  // 2. Create Submission
  const submission = new Submission({
    user_id: user_id,
    task_id: task._id,
    status: status,
    proof: proof,
    completed_at: status === "APPROVED" ? new Date() : null,
  });
  await submission.save();

  // 3. Post-Process
  const response = { submission_status: status };

  if (status === "APPROVED") {
    const { new_badges, points_awarded } = await award_points(user_id, task_id);
    response.new_badges = new_badges;
    response.points_earned = points_awarded;

    // Mark UserTask completed
    if (user_task) {
      user_task.status = "COMPLETED";
      await user_task.save();
    }
  } else if (
    status === "REJECTED"
    // Note: We already throw Errors for auto-rejection above, so this might be redundant
    // but good for safety if we change logic flow.
  ) {
    // If we reached here with REJECTED status and didn't throw, it's an error state
    // But currently we throw inside the blocks.
  }

  return response;
};

export const create_task = async (task_data) => {
  const task = new Task(task_data);
  await task.save();
  return task;
};

export const get_submissions = async (filter) => {
  const submissions = await Submission.find(filter)
    .populate("user_id")
    .populate("task_id");
  return submissions;
};

export const verify_submission = async (submission_id, verdict) => {
  const submission = await Submission.findById(submission_id);
  if (!submission) throw new ServiceError("Submission not found", 404);

  if (submission.status !== "PENDING") {
    throw new ServiceError("Submission is already processed", 400);
  }

  if (!["APPROVED", "REJECTED"].includes(verdict)) {
    throw new ServiceError("Invalid verdict", 400);
  }

  submission.status = verdict;
  if (verdict === "APPROVED") submission.completed_at = new Date();
  await submission.save();

  if (verdict === "APPROVED") {
    await award_points(submission.user_id, submission.task_id);

    // Update UserTask if exists
    // Find assigned user task
    const user_task = await UserTask.findOne({
      user_id: submission.user_id,
      task_id: submission.task_id,
      status: "ASSIGNED",
    });

    if (user_task) {
      user_task.status = "COMPLETED";
      await user_task.save();
    }
  }

  return { status: verdict };
};

export const get_task = async (task_id) => {
  const task = await Task.findById(task_id);
  if (!task) throw new ServiceError("Task not found", 404);
  return task;
};

export const get_active_tasks = async () => {
  const tasks = await Task.find({ is_active: true });
  return tasks;
};

/**
 * Replace all expired tasks for all users (RF6)
 * Called by the scheduler to ensure tasks are replaced immediately on expiration
 *
 * @returns {Promise<Object>} Summary of replacements made
 */
export const replace_expired_tasks_for_all_users = async () => {
  const now = new Date();

  // Find all expired but not yet processed assignments
  const expired_assignments = await UserTask.find({
    status: "ASSIGNED",
    expires_at: { $lt: now },
  }).populate("task_id");

  const results = {
    processed: 0,
    replaced: 0,
    errors: [],
  };

  for (const assignment of expired_assignments) {
    try {
      // Mark as expired
      assignment.status = "EXPIRED";
      await assignment.save();
      results.processed++;

      // Assign a new task of the same frequency
      if (assignment.task_id?.frequency) {
        const user = await User.findById(assignment.user_id);
        if (user) {
          const new_task = await assign_random_task(
            user,
            assignment.task_id.frequency,
          );
          if (new_task) {
            const expires_at = calculate_expiration(
              assignment.task_id.frequency,
            );
            const user_task = new UserTask({
              user_id: assignment.user_id,
              task_id: new_task._id,
              status: "ASSIGNED",
              expires_at: expires_at,
            });
            await user_task.save();
            results.replaced++;
          }
        }
      }
    } catch (error) {
      results.errors.push({
        assignment_id: assignment._id,
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Replace a completed task for a user (RF6)
 * Called after task completion. New task is assigned for the next period.
 *
 * @param {string} user_id - User MongoDB ID
 * @param {string} task_id - Completed task ID
 * @returns {Promise<Object|null>} New task assignment or null
 */
export const replace_completed_task = async (user_id, task_id) => {
  const task = await Task.findById(task_id);
  if (!task || task.frequency === "on_demand" || task.frequency === "onetime") {
    return null; // On-demand and onetime tasks don't need replacement
  }

  const user = await User.findById(user_id);
  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  // Find a new task for the same frequency
  const new_task = await assign_random_task(user, task.frequency);
  if (!new_task) {
    return null;
  }

  // Calculate next period expiration
  const expires_at = calculate_next_period_expiration(task.frequency);

  const user_task = new UserTask({
    user_id: user_id,
    task_id: new_task._id,
    status: "ASSIGNED",
    expires_at: expires_at,
  });
  await user_task.save();

  return user_task;
};

/**
 * Calculate expiration date for current period
 * @param {string} frequency - Task frequency (daily, weekly, monthly)
 * @returns {Date} Expiration date
 */
const calculate_expiration = (frequency) => {
  const now = new Date();
  if (frequency === "daily") {
    const expires = new Date(now);
    expires.setUTCHours(23, 59, 59, 999);
    return expires;
  } else if (frequency === "weekly") {
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 7);
    return expires;
  } else if (frequency === "monthly") {
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);
    return expires;
  }
  return now;
};

/**
 * Calculate expiration date for next period (after completion)
 * @param {string} frequency - Task frequency (daily, weekly, monthly)
 * @returns {Date} Next period expiration date
 */
const calculate_next_period_expiration = (frequency) => {
  const now = new Date();
  if (frequency === "daily") {
    // Tomorrow end of day
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(23, 59, 59, 999);
    return tomorrow;
  } else if (frequency === "weekly") {
    // Next week from now
    const next_week = new Date(now);
    next_week.setDate(next_week.getDate() + 7);
    return next_week;
  } else if (frequency === "monthly") {
    // Next month from now
    const next_month = new Date(now);
    next_month.setMonth(next_month.getMonth() + 1);
    return next_month;
  }
  return now;
};

/**
 * Get expired tasks count (for monitoring)
 * @returns {Promise<number>} Count of expired but not processed tasks
 */
export const get_expired_tasks_count = async () => {
  return UserTask.countDocuments({
    status: "ASSIGNED",
    expires_at: { $lt: new Date() },
  });
};
