import { jest } from "@jest/globals";

// Define mocks
const mockCronSchedule = jest.fn().mockReturnValue({});
const mockUserFind = jest.fn();
const mockNotificationDeleteMany = jest.fn();
const mockNotificationCreate = jest.fn();

// Mock dependencies
jest.unstable_mockModule("node-cron", () => ({
  default: { schedule: mockCronSchedule },
}));

jest.unstable_mockModule("../../../app/models/user.js", () => ({
  default: { find: mockUserFind },
}));

jest.unstable_mockModule("../../../app/models/notification.js", () => ({
  default: { deleteMany: mockNotificationDeleteMany },
}));

jest.unstable_mockModule(
  "../../../app/services/notification_service.js",
  () => ({
    default: { create_notification: mockNotificationCreate },
  }),
);

// Import Module Under Test
const NotificationScheduler = (
  await import("../../../app/services/notification_scheduler.js")
).default;

describe("NotificationScheduler (Unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("init", () => {
    it("should schedule jobs", () => {
      NotificationScheduler.init();

      // Should verify 2 jobs scheduled
      expect(mockCronSchedule).toHaveBeenCalledTimes(2);
      expect(mockCronSchedule).toHaveBeenCalledWith(
        "0 10 * * *",
        expect.any(Function),
        expect.any(Object),
      );
      expect(mockCronSchedule).toHaveBeenCalledWith(
        "0 3 * * 0",
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  describe("cleanup_old_notifications", () => {
    it("should delete old notifications", async () => {
      mockNotificationDeleteMany.mockResolvedValue({ deletedCount: 10 });

      await NotificationScheduler.cleanup_old_notifications();

      expect(mockNotificationDeleteMany).toHaveBeenCalledWith({
        created_at: { $lt: expect.any(Date) },
      });
    });
  });

  describe("send_daily_motivation", () => {
    it("should send motivation to inactive users", async () => {
      const mockUsers = [{ _id: "u1" }, { _id: "u2" }];
      mockUserFind.mockResolvedValue(mockUsers);

      await NotificationScheduler.send_daily_motivation();

      expect(mockUserFind).toHaveBeenCalled();
      expect(mockNotificationCreate).toHaveBeenCalledTimes(2);
      expect(mockNotificationCreate).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ type: "motivational" }),
      );
    });
  });
});
