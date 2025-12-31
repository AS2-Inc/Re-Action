import { jest } from "@jest/globals";
import taskScheduler from "../app/services/task_scheduler.js";
import Task from "../app/models/task.js";
import cron from "node-cron";

// Mock the Task model and cron
jest.mock("../app/models/task.js");
jest.mock("node-cron");

describe("Task Scheduler Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe("expireOldTasks", () => {
    it("should expire tasks that have passed their expiration date", async () => {
      const now = new Date();
      const _pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      Task.updateMany = jest.fn().mockResolvedValue({
        modifiedCount: 3,
      });

      await taskScheduler.expireOldTasks();

      expect(Task.updateMany).toHaveBeenCalledWith(
        {
          expires_at: { $lt: expect.any(Date) },
          expired: false,
          is_active: true,
        },
        {
          $set: {
            expired: true,
            is_active: false,
          },
        },
      );

      expect(console.log).toHaveBeenCalledWith(
        "[Task Scheduler] Expired 3 tasks",
      );
    });

    it("should not log if no tasks expired", async () => {
      Task.updateMany = jest.fn().mockResolvedValue({
        modifiedCount: 0,
      });

      await taskScheduler.expireOldTasks();

      expect(Task.updateMany).toHaveBeenCalled();
      // Should not log the "Expired X tasks" message
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Expired"),
      );
    });

    it("should handle database errors", async () => {
      Task.updateMany = jest.fn().mockRejectedValue(new Error("DB Error"));

      await taskScheduler.expireOldTasks();

      expect(console.error).toHaveBeenCalledWith(
        "[Task Scheduler] Error expiring tasks:",
        expect.any(Error),
      );
    });
  });

  describe("rotateRecurringTasks", () => {
    it("should rotate daily tasks correctly", async () => {
      const mockTask = {
        _id: "task1",
        title: "Daily Task",
        description: "Test daily task",
        category: "Mobility",
        difficulty: "Low",
        base_points: 10,
        verification_method: "GPS",
        verification_criteria: {},
        frequency: "Daily",
        is_active: false,
        repeatable: true,
        expired: true,
      };

      Task.find = jest.fn().mockResolvedValue([mockTask]);

      const mockSave = jest.fn().mockResolvedValue(true);
      Task.prototype.save = mockSave;

      // Mock the Task constructor
      global.Task = jest.fn().mockImplementation((data) => ({
        ...data,
        save: mockSave,
      }));

      await taskScheduler.rotateRecurringTasks();

      expect(Task.find).toHaveBeenCalledWith({
        frequency: { $in: ["Daily", "Weekly"] },
        expired: true,
        is_active: false,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[Task Scheduler] Rotated 1 recurring tasks",
      );
    });

    it("should rotate weekly tasks correctly", async () => {
      const mockTask = {
        _id: "task1",
        title: "Weekly Task",
        description: "Test weekly task",
        category: "Community",
        difficulty: "Medium",
        base_points: 50,
        verification_method: "MANUAL_REPORT",
        verification_criteria: {},
        frequency: "Weekly",
        is_active: false,
        repeatable: true,
        expired: true,
      };

      Task.find = jest.fn().mockResolvedValue([mockTask]);

      const _mockSave = jest.fn().mockResolvedValue(true);

      await taskScheduler.rotateRecurringTasks();

      expect(Task.find).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        "[Task Scheduler] Rotated 1 recurring tasks",
      );
    });

    it("should not rotate if no expired recurring tasks", async () => {
      Task.find = jest.fn().mockResolvedValue([]);

      await taskScheduler.rotateRecurringTasks();

      expect(Task.find).toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Rotated"),
      );
    });

    it("should handle errors during rotation", async () => {
      Task.find = jest.fn().mockRejectedValue(new Error("DB Error"));

      await taskScheduler.rotateRecurringTasks();

      expect(console.error).toHaveBeenCalledWith(
        "[Task Scheduler] Error rotating tasks:",
        expect.any(Error),
      );
    });
  });

  describe("initializeTaskExpirations", () => {
    it("should initialize expiration dates for daily tasks", async () => {
      const mockTask = {
        _id: "task1",
        title: "Daily Task",
        frequency: "Daily",
        is_active: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Task.find = jest.fn().mockResolvedValue([mockTask]);

      await taskScheduler.initializeTaskExpirations();

      expect(Task.find).toHaveBeenCalledWith({
        expires_at: { $exists: false },
        is_active: true,
      });

      // Task should have expires_at set to tomorrow
      expect(mockTask.expires_at).toBeInstanceOf(Date);
      expect(mockTask.save).toHaveBeenCalled();
    });

    it("should initialize expiration dates for weekly tasks", async () => {
      const mockTask = {
        _id: "task1",
        title: "Weekly Task",
        frequency: "Weekly",
        is_active: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Task.find = jest.fn().mockResolvedValue([mockTask]);

      await taskScheduler.initializeTaskExpirations();

      expect(mockTask.expires_at).toBeInstanceOf(Date);
      // Should be set to 7 days from now
      const now = new Date();
      const expectedDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(mockTask.expires_at - expectedDate);
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it("should initialize expiration dates for one-time tasks", async () => {
      const mockTask = {
        _id: "task1",
        title: "One-time Task",
        frequency: "OneTime",
        is_active: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Task.find = jest.fn().mockResolvedValue([mockTask]);

      await taskScheduler.initializeTaskExpirations();

      expect(mockTask.expires_at).toBeInstanceOf(Date);
      // Should be set to 30 days from now
      const now = new Date();
      const expectedDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(mockTask.expires_at - expectedDate);
      expect(timeDiff).toBeLessThan(1000);
    });

    it("should use default expiration for tasks without frequency", async () => {
      const mockTask = {
        _id: "task1",
        title: "Task without frequency",
        is_active: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Task.find = jest.fn().mockResolvedValue([mockTask]);

      await taskScheduler.initializeTaskExpirations();

      expect(mockTask.expires_at).toBeInstanceOf(Date);
      // Default is 7 days
      const now = new Date();
      const expectedDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(mockTask.expires_at - expectedDate);
      expect(timeDiff).toBeLessThan(1000);
    });

    it("should initialize multiple tasks", async () => {
      const mockTasks = [
        {
          _id: "task1",
          title: "Task 1",
          frequency: "Daily",
          is_active: true,
          save: jest.fn().mockResolvedValue(true),
        },
        {
          _id: "task2",
          title: "Task 2",
          frequency: "Weekly",
          is_active: true,
          save: jest.fn().mockResolvedValue(true),
        },
        {
          _id: "task3",
          title: "Task 3",
          frequency: "OneTime",
          is_active: true,
          save: jest.fn().mockResolvedValue(true),
        },
      ];

      Task.find = jest.fn().mockResolvedValue(mockTasks);

      await taskScheduler.initializeTaskExpirations();

      expect(mockTasks[0].save).toHaveBeenCalled();
      expect(mockTasks[1].save).toHaveBeenCalled();
      expect(mockTasks[2].save).toHaveBeenCalled();

      expect(console.log).toHaveBeenCalledWith(
        "[Task Scheduler] Initialized expiration dates for 3 tasks",
      );
    });

    it("should handle errors during initialization", async () => {
      Task.find = jest.fn().mockRejectedValue(new Error("DB Error"));

      await taskScheduler.initializeTaskExpirations();

      expect(console.error).toHaveBeenCalledWith(
        "[Task Scheduler] Error initializing task expirations:",
        expect.any(Error),
      );
    });

    it("should not log if no tasks need initialization", async () => {
      Task.find = jest.fn().mockResolvedValue([]);

      await taskScheduler.initializeTaskExpirations();

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Initialized expiration dates"),
      );
    });
  });

  describe("startTaskScheduler", () => {
    it("should initialize and schedule the task rotation job", () => {
      // Mock cron.schedule
      const mockSchedule = jest.fn();
      cron.schedule = mockSchedule;

      // Mock the initialization and rotation functions
      taskScheduler.initializeTaskExpirations = jest.fn().mockResolvedValue();
      taskScheduler.expireOldTasks = jest.fn().mockResolvedValue();
      taskScheduler.rotateRecurringTasks = jest.fn().mockResolvedValue();

      taskScheduler.startTaskScheduler();

      expect(console.log).toHaveBeenCalledWith(
        "[Task Scheduler] Initializing task scheduler...",
      );

      expect(console.log).toHaveBeenCalledWith(
        "[Task Scheduler] Task scheduler started (runs every hour)",
      );

      // Should schedule with cron (runs every hour)
      expect(mockSchedule).toHaveBeenCalledWith(
        "0 * * * *",
        expect.any(Function),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle tasks with missing frequency gracefully", async () => {
      Task.find = jest.fn().mockResolvedValue([
        {
          _id: "task1",
          title: "Task without frequency",
          is_active: true,
          save: jest.fn().mockResolvedValue(true),
        },
      ]);

      await taskScheduler.initializeTaskExpirations();

      // Should complete without errors
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
