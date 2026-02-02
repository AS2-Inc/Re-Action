import Notification from "../models/notification.js";
import User from "../models/user.js";
import email_service from "./email_service.js";

class NotificationService {
  /**
   * Create and send a notification
   * @param {string} user_id
   * @param {Object} data - { title, message, type, channel, metadata }
   */
  async create_notification(user_id, data) {
    const user = await User.findById(user_id);
    if (!user) {
      throw new Error("User not found");
    }

    const { title, message, type, channel = "in-app", metadata = {} } = data;

    // Check user preferences
    if (!this.should_notify(user, type, channel)) {
      return null;
    }

    // Always save in-app notification if it's not purely an external channel dispatch
    // or if we want history. For now, we save everything.
    const notification = await Notification.create({
      user_id,
      title,
      message,
      type,
      channel,
      metadata,
    });

    // Handle external channels
    if (
      channel === "email" ||
      (channel === "in-app" && user.notification_preferences.email)
    ) {
      await this.send_email_notification(user, title, message);
    }

    return notification;
  }

  /**
   * Check if user should be notified based on preferences
   */
  should_notify(user, type, channel) {
    const prefs = user.notification_preferences || {};

    // 1. Check channel preference
    if (channel === "email" && !prefs.email) return false;
    if (channel === "push" && !prefs.push) return false;

    // 2. Check type preference
    if (type === "motivational" && !prefs.motivational) return false;
    if (type === "feedback" && !prefs.positive_reinforcement) return false;
    if (type === "info" && !prefs.informational) return false;

    return true;
  }

  async send_email_notification(user, title, message) {
    // Basic HTML template
    const html = `
      <h1>${title}</h1>
      <p>Ciao ${user.name},</p>
      <p>${message}</p>
      <br>
      <p>Il team di Re:Action</p>
    `;
    await email_service.send_email(user.email, title, html);
  }

  async get_user_notifications(user_id, limit = 20) {
    return Notification.find({ user_id }).sort({ created_at: -1 }).limit(limit);
  }

  async mark_as_read(notification_id, user_id) {
    return Notification.findOneAndUpdate(
      { _id: notification_id, user_id },
      { is_read: true },
      { new: true },
    );
  }

  async mark_all_as_read(user_id) {
    return Notification.updateMany(
      { user_id, is_read: false },
      { is_read: true },
    );
  }
}

export default new NotificationService();
