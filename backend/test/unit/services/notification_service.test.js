import { jest } from "@jest/globals";

// Define mocks
const mockUserFindById = jest.fn();
const mockNotificationCreate = jest.fn();
const mockNotificationFind = jest.fn();
const mockNotificationFindOneAndUpdate = jest.fn();
const mockNotificationUpdateMany = jest.fn();
const mockSendEmail = jest.fn();

// Mock dependencies
const MockUser = { findById: mockUserFindById };
const MockNotification = {
  create: mockNotificationCreate,
  find: mockNotificationFind,
  findOneAndUpdate: mockNotificationFindOneAndUpdate,
  updateMany: mockNotificationUpdateMany,
};

jest.unstable_mockModule("../../../app/models/user.js", () => ({
  default: MockUser,
}));
jest.unstable_mockModule("../../../app/models/notification.js", () => ({
  default: MockNotification,
}));
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: { send_email: mockSendEmail },
}));

// Import Module Under Test
const NotificationService = (
  await import("../../../app/services/notification_service.js")
).default;

describe("NotificationService (Unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create_notification", () => {
    it("should create notification and send email if allowed", async () => {
      const mockUser = {
        _id: "user-1",
        email: "test@example.com",
        name: "Test",
        notification_preferences: { email: true, motivational: true },
      };
      mockUserFindById.mockResolvedValue(mockUser);
      mockNotificationCreate.mockResolvedValue({ _id: "notif-1" });

      const data = {
        title: "Test",
        message: "Msg",
        type: "motivational",
        channel: "email",
      };

      await NotificationService.create_notification("user-1", data);

      expect(mockNotificationCreate).toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledWith(
        "test@example.com",
        "Test",
        expect.stringContaining("Msg"),
      );
    });

    it("should not create if preference disabled", async () => {
      const mockUser = {
        notification_preferences: { email: false },
      };
      mockUserFindById.mockResolvedValue(mockUser);

      await NotificationService.create_notification("user-1", {
        channel: "email",
        type: "info",
      });

      expect(mockNotificationCreate).not.toHaveBeenCalled();
    });
  });

  describe("mark_as_read", () => {
    it("should update notification", async () => {
      await NotificationService.mark_as_read("notif-1", "user-1");
      expect(mockNotificationFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: "notif-1", user_id: "user-1" },
        { is_read: true },
        { new: true },
      );
    });
  });
});
