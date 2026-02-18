import notification_scheduler from "./notification_scheduler.js";
import task_scheduler from "./task_scheduler.js";
import leaderboard_scheduler from "./leaderboard_scheduler.js";

/**
 * Central Scheduler Manager
 * Initializes all system schedulers
 */
class SchedulerService {
  init() {
    console.log("Initializing System Schedulers...");
    notification_scheduler.init();
    task_scheduler.init();
    leaderboard_scheduler.init();
  }
}

export default new SchedulerService();
