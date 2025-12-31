import cron from "node-cron";
import Task from "../models/task.js";

/**
 * Task Scheduler Service (RF6)
 * Handles automatic expiration and rotation of daily/weekly tasks
 */

/**
 * Expires tasks that have passed their expiration date
 * Marks them as expired and deactivates them
 */
async function expireOldTasks() {
  try {
    const now = new Date();

    const result = await Task.updateMany(
      {
        expires_at: { $lt: now },
        expired: false,
        is_active: true,
      },
      {
        $set: {
          expired: true,
          is_active: false,
        },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(`[Task Scheduler] Expired ${result.modifiedCount} tasks`);
    }
  } catch (error) {
    console.error("[Task Scheduler] Error expiring tasks:", error);
  }
}

/**
 * Creates new task instances for recurring tasks (Daily/Weekly)
 * This rotates tasks by creating fresh instances with new expiration dates
 */
async function rotateRecurringTasks() {
  try {
    const now = new Date();

    // Find all expired recurring tasks (Daily or Weekly)
    const expiredRecurringTasks = await Task.find({
      frequency: { $in: ["Daily", "Weekly"] },
      expired: true,
      is_active: false,
    });

    for (const oldTask of expiredRecurringTasks) {
      // Calculate new expiration date based on frequency
      const expirationDate = new Date(now);
      if (oldTask.frequency === "Daily") {
        expirationDate.setDate(expirationDate.getDate() + 1);
      } else if (oldTask.frequency === "Weekly") {
        expirationDate.setDate(expirationDate.getDate() + 7);
      }

      // Create new task instance (rotation)
      const newTask = new Task({
        title: oldTask.title,
        description: oldTask.description,
        category: oldTask.category,
        difficulty: oldTask.difficulty,
        base_points: oldTask.base_points,
        verification_method: oldTask.verification_method,
        verification_criteria: oldTask.verification_criteria,
        frequency: oldTask.frequency,
        is_active: true,
        repeatable: oldTask.repeatable,
        created_at: now,
        expires_at: expirationDate,
        expired: false,
      });

      await newTask.save();
      console.log(
        `[Task Scheduler] Rotated task: ${newTask.title} (expires: ${expirationDate.toISOString()})`,
      );
    }

    if (expiredRecurringTasks.length > 0) {
      console.log(
        `[Task Scheduler] Rotated ${expiredRecurringTasks.length} recurring tasks`,
      );
    }
  } catch (error) {
    console.error("[Task Scheduler] Error rotating tasks:", error);
  }
}

/**
 * Initializes tasks that don't have expiration dates
 * Sets default expiration for existing tasks based on their frequency
 */
async function initializeTaskExpirations() {
  try {
    const tasksWithoutExpiration = await Task.find({
      expires_at: { $exists: false },
      is_active: true,
    });

    const now = new Date();

    for (const task of tasksWithoutExpiration) {
      const expirationDate = new Date(now);

      if (task.frequency === "Daily") {
        expirationDate.setDate(expirationDate.getDate() + 1);
      } else if (task.frequency === "Weekly") {
        expirationDate.setDate(expirationDate.getDate() + 7);
      } else if (task.frequency === "OneTime") {
        // OneTime tasks expire after 30 days if not completed
        expirationDate.setDate(expirationDate.getDate() + 30);
      } else {
        // Default: 7 days
        expirationDate.setDate(expirationDate.getDate() + 7);
      }

      task.expires_at = expirationDate;
      await task.save();
    }

    if (tasksWithoutExpiration.length > 0) {
      console.log(
        `[Task Scheduler] Initialized expiration dates for ${tasksWithoutExpiration.length} tasks`,
      );
    }
  } catch (error) {
    console.error(
      "[Task Scheduler] Error initializing task expirations:",
      error,
    );
  }
}

/**
 * Main job that runs periodically to manage task lifecycle
 */
async function runTaskRotationJob() {
  console.log("[Task Scheduler] Running task rotation job...");
  await expireOldTasks();
  await rotateRecurringTasks();
}

/**
 * Starts the task scheduler
 * - Runs every hour to check for expired tasks
 * - Initializes expiration dates on startup
 */
export function startTaskScheduler() {
  console.log("[Task Scheduler] Initializing task scheduler...");

  // Initialize expiration dates for existing tasks
  initializeTaskExpirations();

  // Run immediately on startup
  runTaskRotationJob();

  // Schedule to run every hour
  // Cron format: minute hour day month dayOfWeek
  cron.schedule("0 * * * *", () => {
    runTaskRotationJob();
  });

  console.log("[Task Scheduler] Task scheduler started (runs every hour)");
}

export default {
  startTaskScheduler,
  expireOldTasks,
  rotateRecurringTasks,
  initializeTaskExpirations,
};
