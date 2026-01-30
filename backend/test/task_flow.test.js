import { jest } from "@jest/globals";

// Mock the TaskService
jest.unstable_mockModule("../app/services/task_service.js", () => ({
  get_user_tasks: jest.fn(),
  submit_task: jest.fn(),
}));

// Mock Middleware (optional, but good for isolation if we don't want to rely on real User lookup)
// But since token_checker uses User.findById, we might need to mock User model too if we stick to real middleware.
// Let's mock User model to satisfy token_checker.
const mockUserModel = jest.fn();
mockUserModel.findById = jest.fn();
jest.unstable_mockModule("../app/models/user.js", () => ({
  default: mockUserModel,
}));

// Import App after mocks
const { default: app } = await import("../app/app.js");
const { default: request } = await import("supertest");
const TaskService = await import("../app/services/task_service.js");
import jwt from "jsonwebtoken";

describe("Task API Endpoints", () => {
  let token;
  const userId = "user123";

  beforeAll(() => {
    process.env.SUPER_SECRET = "test-secret";
    token = jwt.sign(
      { id: userId, email: "test@example.com", role: "citizen" },
      process.env.SUPER_SECRET,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup User mock for token_checker
    // token_checker calls User.findById(req.logged_user.id)
    // It might also populate neighborhood
    const userQueryChain = {
      populate: jest.fn().mockResolvedValue({
        _id: userId,
        email: "test@example.com",
        neighborhood_id: "n1",
      }),
    };
    mockUserModel.findById.mockReturnValue(userQueryChain);
  });

  describe("GET /api/v1/tasks", () => {
    it("should return tasks from service", async () => {
      const mockTasks = [
        {
          _id: "t1",
          title: "Daily Task",
          frequency: "daily",
          assignment_status: "ASSIGNED",
        },
        {
          _id: "t2",
          title: "Static Task",
          frequency: "on_demand",
          assignment_status: "AVAILABLE",
        },
      ];
      TaskService.get_user_tasks.mockResolvedValue(mockTasks);

      const res = await request(app)
        .get("/api/v1/tasks")
        .set("x-access-token", token);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe("Daily Task");
      expect(TaskService.get_user_tasks).toHaveBeenCalledWith(userId);
    });

    it("should handle service errors", async () => {
      TaskService.get_user_tasks.mockRejectedValue(new Error("Service Error"));

      const res = await request(app)
        .get("/api/v1/tasks")
        .set("x-access-token", token);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to fetch tasks");
    });
  });

  describe("POST /api/v1/tasks/submit", () => {
    it("should submit task via service", async () => {
      const mockResponse = {
        submission_status: "APPROVED",
        points_earned: 10,
        new_badges: [],
      };
      TaskService.submit_task.mockResolvedValue(mockResponse);

      const res = await request(app)
        .post("/api/v1/tasks/submit")
        .set("x-access-token", token)
        .send({ task_id: "t1", proof: { gps: [0, 0] } });

      expect(res.status).toBe(200);
      expect(res.body.submission_status).toBe("APPROVED");
      expect(TaskService.submit_task).toHaveBeenCalledWith(userId, "t1", {
        gps: [0, 0],
      });
    });

    it("should handle submission errors", async () => {
      TaskService.submit_task.mockRejectedValue(
        new Error("Verification failed"),
      );

      const res = await request(app)
        .post("/api/v1/tasks/submit")
        .set("x-access-token", token)
        .send({ task_id: "t1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Verification failed");
    });
  });
});
