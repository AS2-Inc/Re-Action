import ServiceError from "../errors/service_error.js";
import Neighborhood from "../models/neighborhood.js";
import Submission from "../models/submission.js";
import Task from "../models/task.js";
import User from "../models/user.js";
import UserTask from "../models/user_task.js";
import BadgeService from "./badge_service.js";
import leaderboard_service from "./leaderboard_service.js";
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
    user.ambient.km_green += task.impact_metrics.km_green || 0;
  }

  // Level Logic (Moved to BadgeService)
  BadgeService.check_level_up(user);

  await user.save();

  if (user.neighborhood_id) {
    const neighborhood = await Neighborhood.findById(user.neighborhood_id);
    if (neighborhood) {
      // Update neighborhood via leaderboard service (base_points + environmental data)
      const impact = task.impact_metrics
        ? {
            co2_saved: task.impact_metrics.co2_saved || 0,
            waste_recycled: task.impact_metrics.waste_recycled || 0,
            km_green: task.impact_metrics.km_green || 0,
          }
        : {};
      await leaderboard_service.on_task_completed(
        user.neighborhood_id,
        points_to_award,
        impact,
      );

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
  const tasks_response = [];

  // 1. Periodic Tasks (Daily, Weekly, Monthly)
  // Check assignments and lazily assign if missing
  const frequencies = ["daily", "weekly", "monthly"];

  for (const freq of frequencies) {
    // Check if there is an active assignment
    let assignment = await UserTask.findOne({
      user_id: user_id,
      status: "ASSIGNED",
      expires_at: { $gt: now },
    })
      .populate("task_id")
      .then((assignment) => {
        // Filter by frequency match just in case
        if (assignment?.task_id?.frequency === freq) return assignment;
        return null;
      });

    if (!assignment) {
      const existing_assignment = await UserTask.findOne({
        user_id: user_id,
        status: "ASSIGNED",
        expires_at: { $gt: now },
      }).populate({
        path: "task_id",
        match: { frequency: freq },
      });

      if (existing_assignment?.task_id) {
        assignment = existing_assignment;
      } else {
        const last_completion = await Submission.findOne({
          user_id: user_id,
          status: "APPROVED",
        })
          .populate({
            path: "task_id",
            match: { frequency: freq },
          })
          .sort({ completed_at: -1 });

        let already_done_period = false;
        if (last_completion?.task_id) {
          const last = new Date(last_completion.completed_at);
          if (freq === "daily" && last.toDateString() === now.toDateString()) {
            already_done_period = true;
          } else if (freq === "weekly") {
            const diff = (now - last) / (1000 * 60 * 60 * 24);
            if (diff < 7) already_done_period = true;
          } else if (freq === "monthly") {
            if (
              now.getMonth() === last.getMonth() &&
              now.getFullYear() === last.getFullYear()
            ) {
              already_done_period = true;
            }
          }
        }

        if (!already_done_period) {
          const new_task = await assign_random_task(user, freq);
          if (new_task) {
            const expires_at = calculate_expiration(freq);
            const user_task = new UserTask({
              user_id: user_id,
              task_id: new_task._id,
              status: "ASSIGNED",
              expires_at: expires_at,
            });
            await user_task.save();
            assignment = user_task;
            assignment.task_id = new_task; // Populate manually for response
          }
        }
      }
    }

    if (assignment?.task_id) {
      const last_approved_query = Submission.findOne({
        user_id: user_id,
        task_id: assignment.task_id._id,
        status: "APPROVED",
      });
      const last_approved =
        typeof last_approved_query.sort === "function"
          ? await last_approved_query.sort({ completed_at: -1 })
          : await last_approved_query;

      if (last_approved?.completed_at) {
        const last = new Date(last_approved.completed_at);
        let already_done_period = false;

        if (freq === "daily" && last.toDateString() === now.toDateString()) {
          already_done_period = true;
        } else if (freq === "weekly") {
          const diff = (now - last) / (1000 * 60 * 60 * 24);
          if (diff < 7) already_done_period = true;
        } else if (freq === "monthly") {
          if (
            now.getMonth() === last.getMonth() &&
            now.getFullYear() === last.getFullYear()
          ) {
            already_done_period = true;
          }
        }

        if (already_done_period) {
          if (assignment.status !== "COMPLETED") {
            assignment.status = "COMPLETED";
            await assignment.save();
          }
          continue;
        }
      }

      // Check for pending submission
      const pending_submission = await Submission.findOne({
        user_id: user_id,
        task_id: assignment.task_id._id,
        status: "PENDING",
      });

      tasks_response.push({
        ...assignment.task_id.toObject(),
        user_task_id: assignment._id,
        expires_at: assignment.expires_at,
        status: assignment.status,
        submission_status: pending_submission ? "PENDING" : null,
      });
    }
  }

  // 2. On-Demand Tasks (Always available)
  const on_demand_tasks = await Task.find({
    frequency: "on_demand",
    is_active: true,
    $or: [{ neighborhood_id: null }, { neighborhood_id: user.neighborhood_id }],
  });

  for (const t of on_demand_tasks) {
    tasks_response.push({
      ...t.toObject(),
      status: "AVAILABLE", // Distinct status for UI
    });
  }

  // 3. One-Time Tasks (Available if not completed)
  const one_time_tasks = await Task.find({
    frequency: "onetime",
    is_active: true,
    $or: [{ neighborhood_id: null }, { neighborhood_id: user.neighborhood_id }],
  });

  for (const t of one_time_tasks) {
    // Check if completed
    const completed = await Submission.exists({
      user_id: user_id,
      task_id: t._id,
      status: "APPROVED",
    });

    if (!completed) {
      tasks_response.push({
        ...t.toObject(),
        status: "AVAILABLE",
      });
    }
  }

  return tasks_response;
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
  const user = await User.findById(user_id);
  const submission = new Submission({
    user_id: user_id,
    task_id: task._id,
    neighborhood_id: user?.neighborhood_id || null,
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

    // Recalculate leaderboard immediately
    await leaderboard_service.get_leaderboard();

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

    // Recalculate leaderboard immediately
    await leaderboard_service.get_leaderboard();

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

export const get_all_tasks = async () => {
  const tasks = await Task.find()
    .populate("neighborhood_id", "name")
    .sort({ created_at: -1 });

  return tasks.map((task) => {
    const task_obj = task.toObject();
    task_obj.neighborhood_name = task_obj.neighborhood_id?.name || null;
    delete task_obj.neighborhood_id;
    return task_obj;
  });
};

export const update_task = async (task_id, updates) => {
  const task = await Task.findByIdAndUpdate(
    task_id,
    { $set: updates },
    { new: true },
  );
  if (!task) {
    throw new ServiceError("Task not found", 404);
  }
  return task;
};

export const delete_task = async (task_id) => {
  const task = await Task.findByIdAndDelete(task_id);
  if (!task) {
    throw new ServiceError("Task not found", 404);
  }
  return task;
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
