import { jest } from "@jest/globals";
import * as db from "../../db_helper.js";

// Mock email service
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    send_email: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Import real modules
const User = (await import("../../../app/models/user.js")).default;
const Notification = (await import("../../../app/models/notification.js"))
  .default;
const notification_service = (
  await import("../../../app/services/notification_service.js")
).default;
const email_service = (await import("../../../app/services/email_service.js"))
  .default;

describe("NotificationService", () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  const createUser = async (prefs = {}) => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      password: "password123",
      role: "citizen",
      is_active: true,
      notification_preferences: {
        email: true,
        positive_reinforcement: true,
        ...prefs,
      },
    });
    return await user.save();
  };

  describe("create_notification", () => {
    it("should create a notification and send email if preferences allow", async () => {
      const user = await createUser({
        email: true,
        positive_reinforcement: true,
      });

      const result = await notification_service.create_notification(user._id, {
        title: "Good Job!",
        message: "You did it!",
        type: "feedback",
        channel: "in-app",
      });

      expect(result).toBeTruthy();

      const notif = await Notification.findById(result._id);
      expect(notif).toBeTruthy();
      expect(notif.user_id.toString()).toBe(user._id.toString());
      expect(notif.title).toBe("Good Job!");

      // Email service call
      if (email_service.send_email) {
        expect(email_service.send_email).toHaveBeenCalled();
      }
    });

    it("should NOT create notification if preferences disable it", async () => {
      const user = await createUser({
        email: false,
        positive_reinforcement: false,
      });

      const result = await notification_service.create_notification(user._id, {
        title: "Good Job!",
        message: "You did it!",
        type: "feedback",
        channel: "in-app",
      });

      // If service returns null when filtered/disabled
      expect(result).toBeNull();

      const count = await Notification.countDocuments();
      expect(count).toBe(0);
    });
  });
});
