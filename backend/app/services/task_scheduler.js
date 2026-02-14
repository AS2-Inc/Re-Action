import cron from "node-cron";
import * as TaskService from "./task_service.js";

/**
 * Task Scheduler (RF6)
 * Handles maintenance jobs for tasks and data synchronization
 */
class TaskScheduler {
  constructor() {
    this.jobs = [];
  }

  init() {
    console.log("Initializing Task Service Scheduler...");

    // Check and replace expired tasks every hour (RF6)
    this.schedule("0 * * * *", this.replace_expired_tasks);
  }

  schedule(cron_expression, callback) {
    const task = cron.schedule(cron_expression, callback.bind(this), {
      scheduled: true,
      timezone: "Europe/Rome",
    });
    this.jobs.push(task);
    console.log(`Task Job scheduled: ${cron_expression}`);
  }

  /**
   * Replace expired tasks for all users (RF6)
   */
  async replace_expired_tasks() {
    console.log("Running expired task replacement job...");
    try {
      const results = await TaskService.replace_expired_tasks_for_all_users();
      console.log(
        `Task replacement: ${results.processed} expired, ${results.replaced} replaced.`,
      );
      if (results.errors.length > 0) {
        console.error("Task replacement errors:", results.errors);
      }
    } catch (error) {
      console.error("Error in expired task replacement job:", error);
    }
  }
}

export default new TaskScheduler();
