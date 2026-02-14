import { jest } from "@jest/globals";
import * as db from "../../db_helper.js";

// Mock EmailService to avoid real emails during tests
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    send_email: jest.fn().mockResolvedValue(true),
  },
}));

const request = (await import("supertest")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../../app/app.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const Notification = (await import("../../../app/models/notification.js"))
  .default;

describe("Notifications Router Integration Tests", () => {
  let user;
  let token;
  let notification;

  beforeAll(async () => {
    await db.connect();
    process.env.SUPER_SECRET = "test-secret";
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  const createTestUser = async () => {
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const newUser = new User({
      name: "Notif",
      surname: "Tester",
      email: `notif-router-${uniqueId}@example.com`,
      password: "Password123!",
      role: "citizen",
      is_active: true,
      notification_preferences: {
        email: true,
        push: true,
        daily: true,
        motivational: true,
      },
    });
    await newUser.save();
    return newUser;
  };

  const createNotification = async (userId, title = "Test Notif") => {
    return await Notification.create({
      user_id: userId,
      title: title,
      message: "This is a test notification",
      type: "info",
      channel: "in-app",
    });
  };

  const generateToken = (userData) => {
    return jwt.sign(
      { email: userData.email, id: userData._id, role: userData.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = generateToken(user);
    notification = await createNotification(user._id);
  });

  describe("GET /api/v1/notifications", () => {
    it("should return user notifications", async () => {
      const res = await request(app)
        .get("/api/v1/notifications")
        .set("x-access-token", token);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe("Test Notif");
    });

    it("should return empty list if no notifications", async () => {
      // Clear notifications
      await Notification.deleteMany({});

      const res = await request(app)
        .get("/api/v1/notifications")
        .set("x-access-token", token);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });
  });

  describe("PATCH /api/v1/notifications/:id/read", () => {
    it("should mark notification as read", async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notification._id}/read`)
        .set("x-access-token", token);

      expect(res.status).toBe(200);
      expect(res.body.is_read).toBe(true);

      const updated = await Notification.findById(notification._id);
      expect(updated.is_read).toBe(true);
    });

    it("should return 404 if notification not found or belongs to another user", async () => {
      const otherUser = await createTestUser(); // Creates a user with different ID
      const otherNotif = await createNotification(otherUser._id);

      const res = await request(app)
        .patch(`/api/v1/notifications/${otherNotif._id}/read`)
        .set("x-access-token", token); // Using original user's token

      // Should fail because original user doesn't own this notification
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/notifications/read-all", () => {
    it("should mark all notifications as read", async () => {
      await createNotification(user._id, "Notif 2");
      await createNotification(user._id, "Notif 3");

      const res = await request(app)
        .patch("/api/v1/notifications/read-all")
        .set("x-access-token", token);

      expect(res.status).toBe(200);

      const unreadCount = await Notification.countDocuments({
        user_id: user._id,
        is_read: false,
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe("GET /api/v1/notifications/preferences", () => {
    it("should return current preferences", async () => {
      const res = await request(app)
        .get("/api/v1/notifications/preferences")
        .set("x-access-token", token);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(true);
      expect(res.body.motivational).toBe(true);
    });
  });

  describe("PATCH /api/v1/notifications/preferences", () => {
    it("should update specific preferences", async () => {
      const res = await request(app)
        .patch("/api/v1/notifications/preferences")
        .set("x-access-token", token)
        .send({
          motivational: false,
          daily: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.preferences.motivational).toBe(false);
      expect(res.body.preferences.daily).toBe(false);
      expect(res.body.preferences.email).toBe(true); // Should remain unchanged

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.notification_preferences.motivational).toBe(false);
    });

    it("should update positive_reinforcement preference", async () => {
      const res = await request(app)
        .patch("/api/v1/notifications/preferences")
        .set("x-access-token", token)
        .send({
          positive_reinforcement: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.preferences.positive_reinforcement).toBe(false);
    });
  });
});
