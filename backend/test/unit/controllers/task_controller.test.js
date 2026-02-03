import { jest } from "@jest/globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock the TaskService
const mockGetUserTasks = jest.fn();
const mockSubmitTask = jest.fn();
const mockCreateTask = jest.fn();
const mockGetSubmissions = jest.fn();
const mockVerifySubmission = jest.fn();
const mockGetTask = jest.fn();
const mockGetActiveTasks = jest.fn();

jest.unstable_mockModule("../../../app/services/task_service.js", () => ({
  get_user_tasks: mockGetUserTasks,
  submit_task: mockSubmitTask,
  create_task: mockCreateTask,
  get_submissions: mockGetSubmissions,
  verify_submission: mockVerifySubmission,
  get_task: mockGetTask,
  get_active_tasks: mockGetActiveTasks,
}));

const TaskControllerModule = await import(
  "../../../app/controllers/task_controller.js"
);
const Controller = TaskControllerModule;

describe("TaskController", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      logged_user: { id: "user-id-123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      location: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("get_user_tasks", () => {
    it("should return tasks for the logged-in user", async () => {
      const mockTasks = [{ id: 1, title: "Task 1" }];
      mockGetUserTasks.mockResolvedValue(mockTasks);

      await Controller.get_user_tasks(req, res);

      expect(mockGetUserTasks).toHaveBeenCalledWith("user-id-123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTasks);
    });

    it("should handle User not found error", async () => {
      mockGetUserTasks.mockRejectedValue(new Error("User not found"));

      await Controller.get_user_tasks(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    it("should handle generic errors", async () => {
      mockGetUserTasks.mockRejectedValue(new Error("Database error"));

      await Controller.get_user_tasks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
    });
  });

  describe("submit_task", () => {
    it("should submit a task successfully", async () => {
      req.body = { task_id: "task-1", proof: { answer: "yes" } };
      mockSubmitTask.mockResolvedValue({ status: "PENDING" });

      await Controller.submit_task(req, res);

      expect(mockSubmitTask).toHaveBeenCalledWith("user-id-123", "task-1", {
        answer: "yes",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: "PENDING" });
    });

    it("should handle file uploads", async () => {
      req.body = {
        task_id: "task-1",
        proof: JSON.stringify({ comment: "photo attached" }),
      };
      req.file = { filename: "photo.jpg" };
      mockSubmitTask.mockResolvedValue({ status: "PENDING" });

      await Controller.submit_task(req, res);

      expect(mockSubmitTask).toHaveBeenCalledWith("user-id-123", "task-1", {
        comment: "photo attached",
        photo_url: "/uploads/photo.jpg",
      });
    });

    it("should return 400 for verification failure", async () => {
      req.body = { task_id: "task-1" };
      mockSubmitTask.mockRejectedValue(new Error("Verification failed"));

      await Controller.submit_task(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Verification failed" });
    });

    it("should return 400 for Task not assigned or expired", async () => {
      req.body = { task_id: "task-1" };
      mockSubmitTask.mockRejectedValue(
        new Error("Task not assigned or expired"),
      );

      await Controller.submit_task(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Task not assigned or expired",
      });
    });
  });

  describe("create_task", () => {
    it("should create a new task", async () => {
      req.body = { title: "New Task" };
      mockCreateTask.mockResolvedValue({
        id: "new-task-id",
        title: "New Task",
      });

      await Controller.create_task(req, res);

      expect(mockCreateTask).toHaveBeenCalledWith({ title: "New Task" });
      expect(res.location).toHaveBeenCalledWith("/api/v1/tasks/new-task-id");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: "new-task-id",
        title: "New Task",
      });
    });

    it("should handle creation errors", async () => {
      mockCreateTask.mockRejectedValue(new Error("Creation failed"));

      await Controller.create_task(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to create task" });
    });
  });

  describe("get_submissions", () => {
    it("should fetch submissions with filter", async () => {
      req.body = { status: "PENDING" };
      mockGetSubmissions.mockResolvedValue([]);

      await Controller.get_submissions(req, res);

      expect(mockGetSubmissions).toHaveBeenCalledWith({ status: "PENDING" });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("verify_submission", () => {
    it("should verify submission successfully", async () => {
      req.params = { id: "sub-1" };
      req.body = { verdict: "APPROVED" };
      mockVerifySubmission.mockResolvedValue({ status: "APPROVED" });

      await Controller.verify_submission(req, res);

      expect(mockVerifySubmission).toHaveBeenCalledWith("sub-1", "APPROVED");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle Submission not found", async () => {
      req.params = { id: "sub-1" };
      mockVerifySubmission.mockRejectedValue(new Error("Submission not found"));

      await Controller.verify_submission(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should handle Invalid verdict", async () => {
      req.params = { id: "sub-1" };
      mockVerifySubmission.mockRejectedValue(new Error("Invalid verdict"));

      await Controller.verify_submission(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("get_task", () => {
    it("should fetch a task by ID", async () => {
      req.params = { id: "task-1" };
      const mockTask = { id: "task-1", title: "Task 1" };
      mockGetTask.mockResolvedValue(mockTask);

      await Controller.get_task(req, res);

      expect(mockGetTask).toHaveBeenCalledWith("task-1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTask);
    });

    it("should handle Task not found", async () => {
      req.params = { id: "task-1" };
      mockGetTask.mockRejectedValue(new Error("Task not found"));

      await Controller.get_task(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("get_active_tasks", () => {
    it("should fetch active tasks", async () => {
      const mockTasks = [{ id: "task-1", is_active: true }];
      mockGetActiveTasks.mockResolvedValue(mockTasks);

      await Controller.get_active_tasks(req, res);

      expect(mockGetActiveTasks).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTasks);
    });

    it("should handle errors", async () => {
      mockGetActiveTasks.mockRejectedValue(new Error("Database error"));

      await Controller.get_active_tasks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch active tasks",
      });
    });
  });
});
