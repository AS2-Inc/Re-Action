import Task from "../models/task.js";
import UserTask from "../models/user_task.js";
import Submission from "../models/submission.js";
import User from "../models/user.js";
import BadgeService from "./badge_service.js";
import Neighborhood from "../models/neighborhood.js";

// Helper to calculate distance
const _haversine = (coords1, coords2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3; // metres

  const lat1 = coords1[0];
  const lon1 = coords1[1];
  const lat2 = coords2[0];
  const lon2 = coords2[1];

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const delta_phi = toRad(lat2 - lat1);
  const delta_lambda = toRad(lon2 - lon1);

  const a =
    Math.sin(delta_phi / 2) * Math.sin(delta_phi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(delta_lambda / 2) *
      Math.sin(delta_lambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

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
  if (!user) throw new Error("User not found");
  const now = new Date();

  // 1. Get On-Demand Tasks (Static)
  // Filter by Neighborhood OR Global
  const on_demand_tasks = await Task.find({
    frequency: "on_demand",
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
  // Priority: Neighborhood Tasks first, then Global
  // Actually, we should pool them together or prioritize?
  // Let's mix them: Find all valid tasks (Global + Neighborhood).

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
  if (!task) throw new Error("Task not found");

  // Update UserTask if it exists (for rotating tasks)
  let user_task = null;
  if (task.frequency !== "on_demand") {
    user_task = await UserTask.findOne({
      user_id: user_id,
      task_id: task_id,
      status: "ASSIGNED",
    });
    // TODO: If no assigned task found, and it's not on_demand, strictly speaking we should block.
    // But maybe allow if it hasn't expired?
    // For now, strict: Must be assigned.
    if (!user_task) throw new Error("Task not assigned or expired");
  }

  // 1. Verify
  let is_valid = true; // Manual tasks auto-pending, handled later
  let status = "PENDING";

  if (task.verification_method === "GPS") {
    const target = task.verification_criteria?.target_location; // [lat, lon]
    const user_loc = proof?.gps_location; // [lat, lon]
    if (!target || !user_loc) {
      is_valid = false;
    } else {
      const dist = _haversine(target, user_loc);
      const min_dist = task.verification_criteria?.min_distance_meters || 100; // default 100m radius
      if (dist > min_dist) is_valid = false;
    }
    status = is_valid ? "APPROVED" : "REJECTED";
  } else if (task.verification_method === "QR_SCAN") {
    if (proof?.qr_code_data !== task.verification_criteria?.qr_code_secret) {
      is_valid = false;
    }
    status = is_valid ? "APPROVED" : "REJECTED";
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
    status === "REJECTED" &&
    task.verification_method !== "MANUAL_REPORT"
  ) {
    // Auto rejection
    throw new Error("Verification failed");
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
