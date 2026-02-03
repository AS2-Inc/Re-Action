import { jest } from "@jest/globals";
import { connect, close, clear } from "../../db_helper.js";

// Define mocks
const mockSchedule = jest.fn().mockReturnValue({});
const mockCreateNotification = jest.fn();

// Mock modules
jest.unstable_mockModule("node-cron", () => ({
  default: { schedule: mockSchedule },
}));

// We need to mock the full path or relative path exactly as imported
jest.unstable_mockModule(
  "../../../app/services/notification_service.js",
  () => ({
    default: { create_notification: mockCreateNotification },
  }),
);

// Dynamic import for module under test
const NotificationSchedulerModule = await import(
  "../../../app/services/notification_scheduler.js"
);
const NotificationScheduler = NotificationSchedulerModule.default;

// Dynamic import for models
const UserModule = await import("../../../app/models/user.js");
const User = UserModule.default;
const NotificationModule = await import("../../../app/models/notification.js");
const Notification = NotificationModule.default;

describe("NotificationScheduler", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await close();
  });

  describe("init", () => {
    it("should schedule daily motivation and cleanup jobs", () => {
      NotificationScheduler.init();

      expect(mockSchedule).toHaveBeenCalledTimes(2);
      expect(mockSchedule).toHaveBeenCalledWith(
        "0 10 * * *",
        expect.any(Function),
        expect.any(Object),
      );
      expect(mockSchedule).toHaveBeenCalledWith(
        "0 3 * * 0",
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  describe("cleanup_old_notifications", () => {
    it("should delete notifications older than 30 days", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      const newDate = new Date();
      newDate.setDate(newDate.getDate() - 10);

      // Create dummy notifications
      // We need to manually set created_at which might be overridden by default default: Date.now
      // So we use logic to bypass mongoose default if possible or update it after creation

      const notif1 = await Notification.create({
        user_id: new SimpleObjectId(),
        title: "Old",
        message: "Old msg",
        type: "system",
      });
      // Force update created_at
      await Notification.updateOne(
        { _id: notif1._id },
        { $set: { created_at: oldDate } },
      );

      const notif2 = await Notification.create({
        user_id: new SimpleObjectId(),
        title: "New",
        message: "New msg",
        type: "system",
      });
      // Force update created_at
      await Notification.updateOne(
        { _id: notif2._id },
        { $set: { created_at: newDate } },
      );

      await NotificationScheduler.cleanup_old_notifications();

      const remaining = await Notification.find({});
      expect(remaining.length).toBe(1);
      expect(remaining[0].title).toBe("New");
    });
  });

  describe("send_daily_motivation", () => {
    it("should send notifications to inactive users", async () => {
      const inactiveDate = new Date();
      inactiveDate.setDate(inactiveDate.getDate() - 4);

      const activeDate = new Date();
      activeDate.setDate(activeDate.getDate() - 1);

      const inactiveUser = await User.create({
        username: "inactive",
        email: "inactive@example.com",
        password: "Password123!",
        last_activity_date: inactiveDate,
        notification_preferences: { motivational: true },
      });

      const _activeUser = await User.create({
        username: "active",
        email: "active@example.com",
        password: "Password123!",
        last_activity_date: activeDate,
        notification_preferences: { motivational: true },
      });

      const _optOutUser = await User.create({
        username: "optout",
        email: "optout@example.com",
        password: "Password123!",
        last_activity_date: inactiveDate,
        notification_preferences: { motivational: false },
      });

      await NotificationScheduler.send_daily_motivation();

      expect(mockCreateNotification).toHaveBeenCalledTimes(1);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        inactiveUser._id,
        expect.objectContaining({
          type: "motivational",
          title: "Ci manchi!",
        }),
      );
    });
  });
});

// Helper for ObjectId
import mongoose from "mongoose";
const SimpleObjectId = mongoose.Types.ObjectId;
