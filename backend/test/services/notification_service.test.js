import notification_service from "../../app/services/notification_service.js";
import Notification from "../../app/models/notification.js";
import User from "../../app/models/user.js";
import email_service from "../../app/services/email_service.js";
import { jest } from "@jest/globals";

// Mock email service
email_service.send_email = jest.fn();

// Mock instances
Notification.create = jest.fn();
Notification.find = jest.fn();
Notification.findOneAndUpdate = jest.fn();
Notification.updateMany = jest.fn();

// User model mock
User.findById = jest.fn();
User.find = jest.fn();

describe("NotificationService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create_notification", () => {
    it("should create a notification and send email if preferences allow", async () => {
      const user_id = "user123";
      const user_mock = {
        _id: user_id,
        email: "test@example.com",
        name: "Test User",
        notification_preferences: {
          email: true,
          positive_reinforcement: true,
        },
      };

      User.findById.mockResolvedValue(user_mock);
      Notification.create.mockResolvedValue({ _id: "notif123", ...user_mock });

      await notification_service.create_notification(user_id, {
        title: "Good Job!",
        message: "You did it!",
        type: "feedback",
        channel: "in-app",
      });

      expect(User.findById).toHaveBeenCalledWith(user_id);
      expect(Notification.create).toHaveBeenCalled();
      expect(email_service.send_email).toHaveBeenCalled();
    });

    it("should NOT create notification if preferences disable it", async () => {
      const user_id = "user123";
      const user_mock = {
        _id: user_id,
        notification_preferences: {
          email: false,
          positive_reinforcement: false, // Disabled feedback
        },
      };

      User.findById.mockResolvedValue(user_mock);

      const result = await notification_service.create_notification(user_id, {
        title: "Good Job!",
        message: "You did it!",
        type: "feedback",
        channel: "in-app",
      });

      expect(result).toBeNull();
      expect(Notification.create).not.toHaveBeenCalled();
      expect(email_service.send_email).not.toHaveBeenCalled();
    });
  });
});
