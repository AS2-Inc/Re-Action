import { jest } from "@jest/globals";
import * as db from "../../db_helper.js";

// Mock EmailService
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    send_email: jest.fn().mockResolvedValue(true),
  },
}));

const User = (await import("../../../app/models/user.js")).default;
const Notification = (await import("../../../app/models/notification.js"))
  .default;
const NotificationService = (
  await import("../../../app/services/notification_service.js")
).default;

describe("Notification Service Triggers (RF5)", () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  const createTestUser = async (preferences = {}) => {
    const user = new User({
      name: "Notif",
      surname: "Tester",
      email: "notif@example.com",
      password: "Password123!",
      notification_preferences: {
        email: true,
        push: true,
        daily: true,
        motivational: true,
        informational: true,
        positive_reinforcement: true,
        ...preferences,
      },
    });
    await user.save();
    return user;
  };

  describe("should_notify preference checks", () => {
    it("should respect motivational preference", async () => {
      const user = await createTestUser({ motivational: false });

      const result = await NotificationService.notify_streak_at_risk(
        user._id,
        5,
      );
      expect(result).toBeNull(); // Should not create notification

      const notifs = await Notification.find({ user_id: user._id });
      expect(notifs.length).toBe(0);
    });

    it("should respect feedback preference", async () => {
      const user = await createTestUser({ positive_reinforcement: false });

      const result = await NotificationService.notify_progress(user._id, {
        type: "level_up",
        value: "Hero",
      });
      expect(result).toBeNull();

      const notifs = await Notification.find({ user_id: user._id });
      expect(notifs.length).toBe(0);
    });

    it("should respect informational preference", async () => {
      const user = await createTestUser({ informational: false });

      const result = await NotificationService.notify_new_challenge(user._id, {
        title: "New Challenge",
      });
      expect(result).toBeNull();

      const notifs = await Notification.find({ user_id: user._id });
      expect(notifs.length).toBe(0);
    });
  });

  describe("Trigger Functions", () => {
    it("notify_new_challenge should create info notification", async () => {
      const user = await createTestUser();
      const challenge = { _id: "chal-1", title: "Plastic Free" };

      const notif = await NotificationService.notify_new_challenge(
        user._id,
        challenge,
      );

      expect(notif).toBeDefined();
      expect(notif.type).toBe("info");
      expect(notif.title).toContain("Nuova sfida");
      expect(notif.metadata.get("challenge_id")).toBe("chal-1");
    });

    it("notify_progress should create feedback notification", async () => {
      const user = await createTestUser();

      const notif = await NotificationService.notify_progress(user._id, {
        type: "points_milestone",
        value: 1000,
      });

      expect(notif).toBeDefined();
      expect(notif.type).toBe("feedback");
      expect(notif.message).toContain("1000 punti");
    });

    it("notify_streak_at_risk should create motivational notification", async () => {
      const user = await createTestUser();

      const notif = await NotificationService.notify_streak_at_risk(
        user._id,
        7,
      );

      expect(notif).toBeDefined();
      expect(notif.type).toBe("motivational");
      expect(notif.message).toContain("7 giorni");
    });
  });
});
