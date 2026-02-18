import cron from "node-cron";
import leaderboard_service from "./leaderboard_service.js";

/**
 * Leaderboard Scheduler
 * Handles periodic updates of neighborhood rankings
 */
class LeaderboardScheduler {
  constructor() {
    this.jobs = [];
  }

  init() {
    console.log("Initializing Leaderboard Scheduler...");

    // Update rankings every hour
    this.schedule("0 * * * *", this.update_rankings);
  }

  schedule(cron_expression, callback) {
    const task = cron.schedule(cron_expression, callback.bind(this), {
      scheduled: true,
      timezone: "Europe/Rome",
    });
    this.jobs.push(task);
    console.log(`Leaderboard Job scheduled: ${cron_expression}`);
  }

  /**
   * Update neighborhood rankings
   */
  async update_rankings() {
    console.log("Running leaderboard update job...");
    try {
      // get_leaderboard triggers a recalculation and update of all rankings
      await leaderboard_service.get_leaderboard({ period: "all_time" });
      console.log("Leaderboard rankings updated successfully.");
    } catch (error) {
      console.error("Error in leaderboard update job:", error);
    }
  }
}

export default new LeaderboardScheduler();
