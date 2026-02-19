import task_scheduler from "./task_scheduler.js";

/**
 * Central Scheduler Manager
 * Initializes all system schedulers
 */
class SchedulerService {
  init() {
    console.log("Initializing System Schedulers...");
    task_scheduler.init();
  }
}

export default new SchedulerService();
