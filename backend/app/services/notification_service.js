import ServiceError from "../errors/service_error.js";
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
      throw new ServiceError("User not found", 404);
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

  /**
   * Notify user about a new challenge/event (RF5 - Informative)
   * @param {string} user_id - User ID
   * @param {Object} challenge - Challenge data { title, description, start_date }
   */
  async notify_new_challenge(user_id, challenge) {
    return this.create_notification(user_id, {
      title: "Nuova sfida disponibile!",
      message: `È iniziata una nuova sfida: "${challenge.title}". Partecipa per guadagnare punti extra!`,
      type: "info",
      channel: "in-app",
      metadata: {
        challenge_id: challenge._id,
        challenge_title: challenge.title,
      },
    });
  }

  /**
   * Notify user about progress milestone (RF5 - Feedback)
   * @param {string} user_id - User ID
   * @param {Object} progress - Progress data { type, value, message }
   */
  async notify_progress(user_id, progress) {
    const messages = {
      points_milestone: `Complimenti! Hai raggiunto ${progress.value} punti totali!`,
      tasks_milestone: `Fantastico! Hai completato ${progress.value} task!`,
      streak_milestone: `${progress.value} giorni consecutivi! Continua così!`,
      level_up: `Sei salito al livello "${progress.value}"!`,
    };

    const message = messages[progress.type] || progress.message;

    return this.create_notification(user_id, {
      title: "Traguardo raggiunto!",
      message,
      type: "feedback",
      channel: "in-app",
      metadata: {
        progress_type: progress.type,
        progress_value: progress.value,
      },
    });
  }

  /**
   * Notify user when their streak is at risk (RF5 - Motivational)
   * @param {string} user_id - User ID
   * @param {number} current_streak - Current streak count
   */
  async notify_streak_at_risk(user_id, current_streak) {
    return this.create_notification(user_id, {
      title: "La tua streak è a rischio!",
      message: `Hai una streak di ${current_streak} giorni. Completa almeno una task oggi per mantenerla!`,
      type: "motivational",
      channel: "in-app",
      metadata: {
        streak_count: current_streak,
      },
    });
  }

  /**
   * Notify user about badge earned (RF5 - Feedback)
   * @param {string} user_id - User ID
   * @param {Object} badge - Badge data { name, description, icon }
   */
  async notify_badge_earned(user_id, badge) {
    return this.create_notification(user_id, {
      title: "Nuovo badge ottenuto!",
      message: `Hai guadagnato il badge "${badge.name}": ${badge.description}`,
      type: "feedback",
      channel: "in-app",
      metadata: {
        badge_id: badge._id,
        badge_name: badge.name,
        badge_icon: badge.icon,
      },
    });
  }

  /**
   * Notify all users in a neighborhood about a new event
   * @param {string} neighborhood_id - Neighborhood ID
   * @param {Object} event - Event data { title, description, date }
   */
  async notify_neighborhood_event(neighborhood_id, event) {
    const users = await User.find({
      neighborhood_id,
      is_active: true,
      "notification_preferences.informational": true,
    });

    const notifications = [];
    for (const user of users) {
      const notification = await this.create_notification(user._id, {
        title: "Nuovo evento nel tuo quartiere!",
        message: `${event.title} - ${event.description}`,
        type: "info",
        channel: "in-app",
        metadata: {
          event_id: event._id,
          event_date: event.date,
        },
      });
      if (notification) notifications.push(notification);
    }
    return notifications;
  }

  /**
   * Notify all active users about a new global challenge
   * @param {Object} challenge - Challenge data { title, description }
   */
  async notify_all_users(challenge) {
    const users = await User.find({
      is_active: true,
      "notification_preferences.informational": true,
    });

    const notifications = [];
    for (const user of users) {
      const notification = await this.create_notification(user._id, {
        title: "Nuova sfida globale!",
        message: `${challenge.title} - ${challenge.description}`,
        type: "info",
        channel: "in-app",
        metadata: {
          challenge_id: challenge._id,
        },
      });
      if (notification) notifications.push(notification);
    }
    return notifications;
  }
}

export default new NotificationService();
