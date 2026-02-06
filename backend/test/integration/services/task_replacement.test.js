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

const mongoose = (await import("mongoose")).default;
const Task = (await import("../../../app/models/task.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const UserTask = (await import("../../../app/models/user_task.js")).default;
const TaskService = await import("../../../app/services/task_service.js");

describe("Task Replacement Logic (RF6)", () => {
  let testUser;
  let neighborhoodId;

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
    neighborhoodId = new mongoose.Types.ObjectId();
    const user = new User({
      name: "Task",
      surname: "Replacer",
      email: "replacer@example.com",
      password: "StrongPassword123!",
      role: "citizen",
      is_active: true,
      neighborhood_id: neighborhoodId,
    });
    await user.save();
    testUser = user;
    return user;
  };

  const createTask = async (data = {}) => {
    const task = new Task({
      title: "Test Task",
      description: "Do something",
      category: "Mobility",
      difficulty: "Low",
      base_points: 10,
      impact_metrics: { co2_saved: 1 },
      verification_method: "MANUAL_REPORT",
      frequency: "daily",
      is_active: true,
      neighborhood_id: neighborhoodId,
      ...data,
    });
    return await task.save();
  };

  const createUserTask = async (
    taskId,
    status = "ASSIGNED",
    expiresAt = null,
  ) => {
    const userTask = new UserTask({
      user_id: testUser._id,
      task_id: taskId,
      status: status,
      assigned_at: new Date(),
      expires_at: expiresAt || new Date(Date.now() + 86400000),
    });
    return await userTask.save();
  };

  describe("replace_expired_tasks_for_all_users", () => {
    it("should mark expired tasks as EXPIRED and create replacements", async () => {
      await createTestUser();

      // Create tasks with different frequencies
      const dailyTask = await createTask({
        title: "Daily Walk",
        frequency: "daily",
      });
      const weeklyTask = await createTask({
        title: "Weekly Challenge",
        frequency: "weekly",
      });

      // Create another available task for replacement
      await createTask({
        title: "Daily Walk 2",
        frequency: "daily",
      });

      // Create expired assignments
      const yesterday = new Date(Date.now() - 86400000);
      await createUserTask(dailyTask._id, "ASSIGNED", yesterday);
      await createUserTask(weeklyTask._id, "ASSIGNED", yesterday);

      // Run replacement
      const result = await TaskService.replace_expired_tasks_for_all_users();

      expect(result.processed).toBe(2);
      expect(result.replaced).toBe(2);
      expect(result.errors.length).toBe(0);

      // Verify old tasks are marked expired
      const expiredTasks = await UserTask.find({ status: "EXPIRED" });
      expect(expiredTasks.length).toBe(2);

      // Verify new tasks are assigned
      const newAssignments = await UserTask.find({ status: "ASSIGNED" });
      expect(newAssignments.length).toBe(2);
    });

    it("should not process already expired tasks", async () => {
      await createTestUser();
      const task = await createTask();

      // Create already expired task
      const yesterday = new Date(Date.now() - 86400000);
      await createUserTask(task._id, "EXPIRED", yesterday);

      const result = await TaskService.replace_expired_tasks_for_all_users();

      expect(result.processed).toBe(0);
      expect(result.replaced).toBe(0);
    });

    it("should handle missing tasks gracefully", async () => {
      await createTestUser();

      // Create user task with non-existent task
      const userTask = new UserTask({
        user_id: testUser._id,
        task_id: new mongoose.Types.ObjectId(), // Non-existent task
        status: "ASSIGNED",
        expires_at: new Date(Date.now() - 86400000),
      });
      await userTask.save();

      const result = await TaskService.replace_expired_tasks_for_all_users();

      expect(result.processed).toBe(1);
      expect(result.replaced).toBe(0); // Can't replace without frequency
    });
  });

  describe("replace_completed_task", () => {
    it("should create a new task assignment for the next period", async () => {
      await createTestUser();

      const task = await createTask({
        title: "Daily Task",
        frequency: "daily",
      });
      await createTask({
        title: "Daily Task 2",
        frequency: "daily",
      });

      const result = await TaskService.replace_completed_task(
        testUser._id,
        task._id,
      );

      expect(result).not.toBeNull();
      expect(result.status).toBe("ASSIGNED");
      expect(result.user_id.toString()).toBe(testUser._id.toString());

      // Expiration should be tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.expires_at.getUTCDate()).toBe(tomorrow.getUTCDate());
    });

    it("should not replace on-demand tasks", async () => {
      await createTestUser();

      const task = await createTask({
        title: "On Demand Task",
        frequency: "on_demand",
      });

      const result = await TaskService.replace_completed_task(
        testUser._id,
        task._id,
      );

      expect(result).toBeNull();
    });

    it("should throw error for non-existent user", async () => {
      await createTestUser();
      const task = await createTask();
      const fakeUserId = new mongoose.Types.ObjectId();

      await expect(
        TaskService.replace_completed_task(fakeUserId, task._id),
      ).rejects.toThrow("User not found");
    });
  });

  describe("get_expired_tasks_count", () => {
    it("should return correct count of expired tasks", async () => {
      await createTestUser();

      const task1 = await createTask();
      const task2 = await createTask();
      const task3 = await createTask();

      const yesterday = new Date(Date.now() - 86400000);
      await createUserTask(task1._id, "ASSIGNED", yesterday); // Expired
      await createUserTask(task2._id, "ASSIGNED", yesterday); // Expired
      await createUserTask(
        task3._id,
        "ASSIGNED",
        new Date(Date.now() + 86400000),
      ); // Not expired

      const count = await TaskService.get_expired_tasks_count();
      expect(count).toBe(2);
    });
  });
});
