import cron from "node-cron";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import notification_service from "./notification_service.js";

class NotificationScheduler {
  constructor() {
    this.jobs = [];
  }

  init() {
    console.log("Initializing Notification Scheduler...");

    // Daily Motivational Notification at 10:00 AM
    this.schedule("0 10 * * *", this.send_daily_motivation);

    // Cleanup old notifications every Sunday at 3:00 AM
    this.schedule("0 3 * * 0", this.cleanup_old_notifications);
  }

  schedule(cron_expression, callback) {
    const task = cron.schedule(cron_expression, callback.bind(this), {
      scheduled: true,
      timezone: "Europe/Rome",
    });
    this.jobs.push(task);
    console.log(`Job scheduled: ${cron_expression}`);
  }

  async cleanup_old_notifications() {
    console.log("Running notification cleanup job...");
    try {
      const thirty_days_ago = new Date();
      thirty_days_ago.setDate(thirty_days_ago.getDate() - 30);

      const result = await Notification.deleteMany({
        created_at: { $lt: thirty_days_ago },
      });

      console.log(`Deleted ${result.deletedCount} old notifications.`);
    } catch (error) {
      console.error("Error in notification cleanup job:", error);
    }
  }

  async send_daily_motivation() {
    console.log("Running daily motivation job...");
    try {
      // Find users who haven't been active in the last 3 days
      const three_days_ago = new Date();
      three_days_ago.setDate(three_days_ago.getDate() - 3);

      const inactive_users = await User.find({
        last_activity_date: { $lt: three_days_ago },
        "notification_preferences.motivational": true,
      });

      console.log(`Found ${inactive_users.length} inactive users.`);

      for (const user of inactive_users) {
        await notification_service.create_notification(user._id, {
          title: "Ci manchi!",
          message:
            "È da un po' che non completi una task. Torna a fare la differenza per il tuo quartiere!",
          type: "motivational",
          channel: "push", // or based on logic
        });
      }
    } catch (error) {
      console.error("Error in daily motivation job:", error);
    }
  }
}

export default new NotificationScheduler();
