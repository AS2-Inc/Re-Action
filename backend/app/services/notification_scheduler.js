import cron from "node-cron";
import Notification from "../models/notification.js";
import User from "../models/user.js";
import notification_service from "./notification_service.js";

class NotificationScheduler {
  constructor() {
    this.jobs = [];
  }

  init() {
    console.log("Initializing Notification Scheduler...");

    // Daily Motivational Notification at 10:00 AM
    this.schedule("0 10 * * *", this.send_daily_motivation);

    // Evening reminder for users who haven't completed tasks at 7:00 PM
    this.schedule("0 19 * * *", this.send_evening_reminder);

    // Cleanup old notifications every Sunday at 3:00 AM
    this.schedule("0 3 * * 0", this.cleanup_old_notifications);

    // Weekly progress summary every Sunday at 9:00 AM
    this.schedule("0 9 * * 0", this.send_weekly_summary);
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
          channel: "in-app",
        });
      }
    } catch (error) {
      console.error("Error in daily motivation job:", error);
    }
  }

  /**
   * Send evening reminder to users who haven't completed tasks today (RF5)
   */
  async send_evening_reminder() {
    console.log("Running evening reminder job...");
    try {
      const today_start = new Date();
      today_start.setHours(0, 0, 0, 0);

      // Find active users who have not completed any task today
      const users_with_activity = await User.find({
        is_active: true,
        last_activity_date: { $lt: today_start },
        "notification_preferences.daily": true,
      });

      console.log(
        `Found ${users_with_activity.length} users without activity today.`,
      );

      for (const user of users_with_activity) {
        // Check if streak is at risk
        const streak_message =
          user.streak > 0
            ? ` Non perdere la tua streak di ${user.streak} giorni!`
            : "";

        await notification_service.create_notification(user._id, {
          title: "Promemoria giornaliero",
          message: `Ci sono ancora task da completare oggi.${streak_message}`,
          type: "info",
          channel: "in-app",
        });
      }
    } catch (error) {
      console.error("Error in evening reminder job:", error);
    }
  }

  /**
   * Send weekly progress summary (RF5)
   */
  async send_weekly_summary() {
    console.log("Running weekly summary job...");
    try {
      const one_week_ago = new Date();
      one_week_ago.setDate(one_week_ago.getDate() - 7);

      // Find users active in the last week
      const active_users = await User.find({
        last_activity_date: { $gte: one_week_ago },
        "notification_preferences.informational": true,
      });

      console.log(`Sending weekly summary to ${active_users.length} users.`);

      for (const user of active_users) {
        await notification_service.create_notification(user._id, {
          title: "Riepilogo settimanale",
          message: `Questa settimana hai accumulato ${user.points} punti e il tuo streak è di ${user.streak} giorni. Continua così!`,
          type: "feedback",
          channel: "in-app",
        });
      }
    } catch (error) {
      console.error("Error in weekly summary job:", error);
    }
  }
}

export default new NotificationScheduler();
