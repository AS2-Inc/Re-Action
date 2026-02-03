import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Helper to get __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mocks
const mockGetUserNotifications = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();

// Absolute path mocking to be safe
const servicePath = path.resolve(
  __dirname,
  "../../../app/services/notification_service.js",
);
jest.unstable_mockModule(servicePath, () => ({
  default: {
    get_user_notifications: mockGetUserNotifications,
    mark_as_read: mockMarkAsRead,
    mark_all_as_read: mockMarkAllAsRead,
  },
}));

// Mock token_checker middleware
const mockTokenChecker = (req, _res, next) => {
  req.logged_user = { id: "user-123", role: "citizen" };
  next();
};
// Router imports middleware/token_checker.js
const middlewarePath = path.resolve(
  __dirname,
  "../../../app/middleware/token_checker.js",
);
jest.unstable_mockModule(middlewarePath, () => ({
  default: mockTokenChecker,
}));

// Mock role_checker middleware
const mockRoleChecker = (_allow) => (_req, _res, next) => next();
const roleCheckerPath = path.resolve(
  __dirname,
  "../../../app/middleware/role_checker.js",
);
jest.unstable_mockModule(roleCheckerPath, () => ({
  default: mockRoleChecker,
}));

// Import App Logic
const NotificationsRouter = (
  await import("../../../app/routers/notifications.js")
).default;
const app = express();
app.use(express.json());
app.use("/api/v1/notifications", NotificationsRouter);

describe("Notifications Router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v1/notifications", () => {
    it("should return user notifications", async () => {
      const mockNotifs = [{ id: 1, title: "Notif 1" }];
      mockGetUserNotifications.mockResolvedValue(mockNotifs);

      const res = await request(app).get("/api/v1/notifications");

      expect(mockGetUserNotifications).toHaveBeenCalledWith("user-123");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockNotifs);
    });

    it("should handle errors", async () => {
      mockGetUserNotifications.mockRejectedValue(new Error("DB Error"));
      const res = await request(app).get("/api/v1/notifications");
      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /api/v1/notifications/:id/read", () => {
    it("should mark notification as read", async () => {
      mockMarkAsRead.mockResolvedValue({ id: "notif-1", read: true });

      const res = await request(app).patch(
        "/api/v1/notifications/notif-1/read",
      );

      expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1", "user-123");
      expect(res.status).toBe(200);
    });

    it("should return 404 if not found", async () => {
      mockMarkAsRead.mockResolvedValue(null);
      const res = await request(app).patch(
        "/api/v1/notifications/notif-1/read",
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/notifications/read-all", () => {
    it("should mark all as read", async () => {
      mockMarkAllAsRead.mockResolvedValue();

      const res = await request(app).patch("/api/v1/notifications/read-all");

      expect(mockMarkAllAsRead).toHaveBeenCalledWith("user-123");
      expect(res.status).toBe(200);
      expect(res.body.message).toContain("marked as read");
    });
  });
});
