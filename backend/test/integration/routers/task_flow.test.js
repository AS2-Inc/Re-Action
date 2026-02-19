import { jest } from "@jest/globals";
import * as db from "../../db_helper.js";

// Mock EmailService
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    sendActivationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Mock BadgeService
jest.unstable_mockModule("../../../app/services/badge_service.js", () => ({
  default: {
    on_points_updated: jest.fn().mockResolvedValue([]),
    on_task_completed: jest.fn().mockResolvedValue([]),
    on_streak_updated: jest.fn().mockResolvedValue([]),
    on_environmental_stats_updated: jest.fn().mockResolvedValue([]),
    check_level_up: jest.fn().mockResolvedValue(true),
    checkAndAwardBadges: jest.fn().mockResolvedValue([]),
    _get_all_badges: jest.fn().mockResolvedValue([]),
    initialize_badges: jest.fn().mockResolvedValue(),
  },
}));

const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../../app/app.js")).default;
const Task = (await import("../../../app/models/task.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const UserTask = (await import("../../../app/models/user_task.js")).default;

describe("Task API Endpoints", () => {
  let citizenToken;
  let userId;

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
    const user = new User({
      name: "Task",
      surname: "Tester",
      email: "taskuser@example.com",
      password: "StrongPassword123!",
      role: "citizen",
      is_active: true,
      neighborhood_id: new mongoose.Types.ObjectId(), // Fake neighborhood
    });
    await user.save();
    userId = user._id;
    return jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  };

  const createTask = async (data = {}) => {
    const task = new Task({
      title: "Test Task",
      description: "Do something",
      category: "Mobility",
      difficulty: "Low",
      base_points: 10,
      impact_metrics: { co2_saved: 1 },
      verification_method: "PHOTO_UPLOAD",
      frequency: "daily",
      ...data,
    });
    return await task.save();
  };

  const assignTask = async (taskId) => {
    const userTask = new UserTask({
      user_id: userId,
      task_id: taskId,
      status: "ASSIGNED",
      assigned_at: new Date(),
      expires_at: new Date(Date.now() + 86400000),
    });
    return await userTask.save();
  };

  describe("GET /api/v1/tasks", () => {
    it("should return tasks for the user", async () => {
      citizenToken = await createTestUser();
      const task1 = await createTask({
        title: "Daily Task",
        frequency: "daily",
      });

      // Assign the daily task
      await assignTask(task1._id);

      const res = await request(app)
        .get("/api/v1/tasks")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/tasks/:id", () => {
    it("should return a task by ID", async () => {
      citizenToken = await createTestUser();
      const task = await createTask({ title: "Specific Task" });

      const res = await request(app)
        .get(`/api/v1/tasks/${task._id}`)
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Specific Task");
    });

    it("should return 404 for non-existent task", async () => {
      citizenToken = await createTestUser();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/v1/tasks/${fakeId}`)
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/tasks/submit", () => {
    it("should submit a task successfully", async () => {
      citizenToken = await createTestUser();
      const task = await createTask({
        category: "Mobility",
        verification_method: "GPS",
        verification_criteria: {
          target_location: [45.4642, 9.19],
          min_distance_meters: 100,
        },
      });
      await assignTask(task._id);

      const res = await request(app)
        .post("/api/v1/tasks/submit")
        .set("x-access-token", citizenToken)
        .send({ task_id: task._id, proof: { gps_location: [45.4642, 9.19] } });

      if (res.status !== 200) {
        console.log("Submit failed:", res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.submission_status).toBe("APPROVED");
    });

    it("should fail validation if verification fails", async () => {
      citizenToken = await createTestUser();

      const task = await createTask({
        category: "Community",
        verification_method: "QUIZ",
      });
      await assignTask(task._id);

      const res = await request(app)
        .post("/api/v1/tasks/submit")
        .set("x-access-token", citizenToken)
        .send({ task_id: task._id, proof: {} }); // Missing quiz answers

      expect(res.status).toBe(400);
    });
  });
});
