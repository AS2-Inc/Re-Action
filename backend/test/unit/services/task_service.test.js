import { jest } from "@jest/globals";

// Define mocks
const mockUserSave = jest.fn();
const mockUserFindById = jest.fn();
const mockUserFind = jest.fn();

const mockTaskSave = jest.fn();
const mockTaskFindById = jest.fn();
const mockTaskFind = jest.fn();
const mockTaskCountDocuments = jest.fn();
const mockTaskFindOne = jest.fn();

const mockUserTaskSave = jest.fn();
const mockUserTaskFind = jest.fn();
const mockUserTaskFindOne = jest.fn();

const mockSubmissionSave = jest.fn();
const mockSubmissionFind = jest.fn();
const mockSubmissionFindById = jest.fn();
const mockSubmissionFindOne = jest.fn();

const mockNeighborhoodFindById = jest.fn();
const mockNeighborhoodSave = jest.fn();

const mockBadgeService = {
  check_level_up: jest.fn(),
  checkAndAwardBadges: jest.fn().mockResolvedValue([]),
};

const mockGPSVerifier = { verify: jest.fn() };
const mockQRVerifier = { verify: jest.fn() };
const mockPhotoVerifier = { verify: jest.fn() };
const mockQuizVerifier = { verify: jest.fn() };

// Mocks for Mongoose Models (Class + Static Methods)
const MockUser = jest.fn(() => ({ save: mockUserSave }));
MockUser.findById = mockUserFindById;
MockUser.find = mockUserFind;

const MockTask = jest.fn(() => ({ save: mockTaskSave }));
MockTask.findById = mockTaskFindById;
MockTask.find = mockTaskFind;
MockTask.countDocuments = mockTaskCountDocuments;
MockTask.findOne = mockTaskFindOne;

const MockUserTask = jest.fn(() => ({ save: mockUserTaskSave }));
MockUserTask.find = mockUserTaskFind;
MockUserTask.findOne = mockUserTaskFindOne;

const MockSubmission = jest.fn(() => ({ save: mockSubmissionSave }));
MockSubmission.find = mockSubmissionFind;
MockSubmission.findById = mockSubmissionFindById;
MockSubmission.findOne = mockSubmissionFindOne;

const MockNeighborhood = jest.fn(() => ({ save: mockNeighborhoodSave }));
MockNeighborhood.findById = mockNeighborhoodFindById;

// Mock dependencies
jest.unstable_mockModule("../../../app/models/user.js", () => ({
  default: MockUser,
}));
jest.unstable_mockModule("../../../app/models/task.js", () => ({
  default: MockTask,
}));
jest.unstable_mockModule("../../../app/models/user_task.js", () => ({
  default: MockUserTask,
}));
jest.unstable_mockModule("../../../app/models/submission.js", () => ({
  default: MockSubmission,
}));
jest.unstable_mockModule("../../../app/models/neighborhood.js", () => ({
  default: MockNeighborhood,
}));

jest.unstable_mockModule("../../../app/services/badge_service.js", () => ({
  default: mockBadgeService,
}));
jest.unstable_mockModule(
  "../../../app/services/verification/gps_verifier.js",
  () => mockGPSVerifier,
);
jest.unstable_mockModule(
  "../../../app/services/verification/qr_verifier.js",
  () => mockQRVerifier,
);
jest.unstable_mockModule(
  "../../../app/services/verification/photo_verifier.js",
  () => mockPhotoVerifier,
);
jest.unstable_mockModule(
  "../../../app/services/verification/quiz_verifier.js",
  () => mockQuizVerifier,
);

// Import Module Under Test
const TaskService = await import("../../../app/services/task_service.js");

describe("TaskService (Unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation specific for instances
    MockUser.mockImplementation((data) => ({
      ...data,
      save: mockUserSave,
      ambient: { co2_saved: 0, waste_recycled: 0, km_green: 0 },
      points: 0,
      streak: 0,
    }));

    MockTask.mockImplementation((data) => ({
      ...data,
      save: mockTaskSave,
      toObject: () => data,
    }));
  });

  describe("award_points", () => {
    it("should award points and update streak", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockUserInstance = {
        _id: "user-1",
        points: 0,
        streak: 1,
        last_activity_date: yesterday,
        ambient: { co2_saved: 0 },
        save: mockUserSave,
      };

      mockUserFindById.mockResolvedValue(mockUserInstance);
      mockTaskFindById.mockResolvedValue({
        _id: "task-1",
        base_points: 100,
        impact_metrics: { co2_saved: 5 },
      });

      const result = await TaskService.award_points("user-1", "task-1");

      expect(result.success).toBe(true);
      expect(mockUserInstance.streak).toBe(2);
      expect(mockUserInstance.points).toBe(100);
      expect(mockUserSave).toHaveBeenCalled();
      expect(mockBadgeService.check_level_up).toHaveBeenCalled();
    });
  });

  describe("create_task", () => {
    it("should create and save a new task", async () => {
      const taskData = { title: "New Task" };

      const result = await TaskService.create_task(taskData);

      expect(MockTask).toHaveBeenCalledWith(taskData);
      expect(mockTaskSave).toHaveBeenCalled();
      expect(result).toHaveProperty("save"); // It returns the mongoose doc
    });
  });

  describe("get_task", () => {
    it("should return task if found", async () => {
      const mockTask = { title: "Find Me" };
      mockTaskFindById.mockResolvedValue(mockTask);

      const result = await TaskService.get_task("task-1");
      expect(result).toBe(mockTask);
    });

    it("should throw if not found", async () => {
      mockTaskFindById.mockResolvedValue(null);
      await expect(TaskService.get_task("task-1")).rejects.toThrow(
        "Task not found",
      );
    });
  });

  describe("submit_task", () => {
    it("should handle GPS verification successfully", async () => {
      const mockTask = {
        _id: "task-gps",
        verification_method: "GPS",
        frequency: "on_demand",
        base_points: 10,
      };
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubmissionFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      mockGPSVerifier.verify.mockReturnValue({ status: "APPROVED" });
      mockSubmissionSave.mockResolvedValue(true);

      mockUserFindById.mockResolvedValue({
        _id: "user-1",
        save: mockUserSave,
        ambient: {},
      }); // For award_points

      const result = await TaskService.submit_task("user-1", "task-gps", {
        lat: 10,
        lng: 10,
      });

      expect(mockGPSVerifier.verify).toHaveBeenCalled();
      expect(result.submission_status).toBe("APPROVED");
      expect(MockSubmission).toHaveBeenCalled();
      // verifying award_points called internally is hard without spying on export?
      // Modules: award_points is exported but called internally.
      // Since it is same execution context, it calls the real award_points.
      // So we verified mocks for award_points (BadgeService etc).
      expect(mockBadgeService.checkAndAwardBadges).toHaveBeenCalled();
    });
  });
});
