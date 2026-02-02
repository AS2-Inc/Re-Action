import { jest } from "@jest/globals";

// Mocks
const mockSave = jest.fn();
const mockFindById = jest.fn();
const mockFindOne = jest.fn();

// Mock Models
const MockTask = {
  findById: mockFindById,
};
const MockUser = {
  findById: mockFindById,
};
const MockSubmission = class {
  constructor(data) {
    Object.assign(this, data);
    this.save = mockSave;
  }
};
const MockUserTask = {
  findOne: mockFindOne,
  save: mockSave,
};
const MockQuiz = {
  findById: mockFindById,
};
const MockNeighborhood = {
  findById: mockFindById,
};

// Mock BadgeService
const mockCheckAndAwardBadges = jest.fn();
const mockCheckLevelUp = jest.fn();

// Setup Module Mocks
jest.unstable_mockModule("../../app/models/task.js", () => ({
  default: MockTask,
}));
jest.unstable_mockModule("../../app/models/user.js", () => ({
  default: MockUser,
}));
jest.unstable_mockModule("../../app/models/submission.js", () => ({
  default: MockSubmission,
}));
jest.unstable_mockModule("../../app/models/user_task.js", () => ({
  default: MockUserTask,
}));
jest.unstable_mockModule("../../app/models/quiz.js", () => ({
  default: MockQuiz,
}));
jest.unstable_mockModule("../../app/models/neighborhood.js", () => ({
  default: MockNeighborhood,
}));
jest.unstable_mockModule("../../app/services/badge_service.js", () => ({
  default: {
    checkAndAwardBadges: mockCheckAndAwardBadges,
    check_level_up: mockCheckLevelUp,
  },
}));

// Import Service (Dynamic import for hoisting)
let TaskService;

describe("TaskService Verification Logic", () => {
  beforeAll(async () => {
    TaskService = await import("../../app/services/task_service.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(true);
    mockCheckAndAwardBadges.mockResolvedValue([]);
  });

  // --- GPS ---
  test("submit_task - GPS Success", async () => {
    const userId = "user123";
    const taskId = "task123";
    const task = {
      _id: taskId,
      frequency: "on_demand",
      verification_method: "GPS",
      base_points: 10,
      verification_criteria: {
        target_location: [40, -74],
        min_distance_meters: 100,
      },
    };

    const user = { _id: userId, points: 0, save: mockSave, ambient: {} };

    mockFindById.mockImplementation((id) => {
      if (id === taskId) return Promise.resolve(task);
      if (id === userId) return Promise.resolve(user);
      return Promise.resolve(null);
    });

    const proof = { gps_location: [40.0001, -74.0001] }; // Close enough
    const result = await TaskService.submit_task(userId, taskId, proof);

    expect(result.submission_status).toBe("APPROVED");
    expect(result.points_earned).toBeGreaterThan(0);
    expect(mockSave).toHaveBeenCalled();
  });

  test("submit_task - GPS Failure", async () => {
    const userId = "user123";
    const taskId = "task123";
    const task = {
      _id: taskId,
      frequency: "on_demand",
      verification_method: "GPS",
      base_points: 10,
      verification_criteria: {
        target_location: [40, -74],
        min_distance_meters: 100,
      },
    };

    mockFindById.mockResolvedValueOnce(task); // Task

    const proof = { gps_location: [41, -75] }; // Far away

    await expect(
      TaskService.submit_task(userId, taskId, proof),
    ).rejects.toThrow(/Distance/);
  });

  // --- QR ---
  test("submit_task - QR Success", async () => {
    const userId = "user123";
    const taskId = "task123";
    const task = {
      _id: taskId,
      frequency: "on_demand",
      verification_method: "QR_SCAN",
      base_points: 10,
      verification_criteria: { qr_code_secret: "SECRET" },
    };
    const user = { _id: userId, points: 0, save: mockSave, ambient: {} };

    mockFindById.mockImplementation((id) => {
      if (id === taskId) return Promise.resolve(task);
      if (id === userId) return Promise.resolve(user);
      return Promise.resolve(null);
    });

    const proof = { qr_code_data: "SECRET" };
    const result = await TaskService.submit_task(userId, taskId, proof);
    expect(result.submission_status).toBe("APPROVED");
  });

  test("submit_task - QR Failure", async () => {
    const userId = "user123";
    const taskId = "task123";
    const task = {
      _id: taskId,
      frequency: "on_demand",
      verification_method: "QR_SCAN",
      base_points: 10,
      verification_criteria: { qr_code_secret: "SECRET" },
    };

    mockFindById.mockResolvedValueOnce(task);

    const proof = { qr_code_data: "WRONG" };
    await expect(
      TaskService.submit_task(userId, taskId, proof),
    ).rejects.toThrow(/Invalid QR Code/);
  });

  // --- QUIZ ---
  test("submit_task - Quiz Success", async () => {
    const userId = "user123";
    const taskId = "task123";
    const quizId = "quiz123";

    const quiz = {
      _id: quizId,
      passing_score: 0.5,
      questions: [{ correct_option_index: 0 }, { correct_option_index: 1 }],
    };

    const task = {
      _id: taskId,
      frequency: "on_demand",
      verification_method: "QUIZ",
      base_points: 20,
      verification_criteria: { quiz_id: quizId },
    };
    const user = { _id: userId, points: 0, save: mockSave, ambient: {} };

    mockFindById.mockImplementation((id) => {
      if (id === taskId) return Promise.resolve(task);
      if (id === quizId) return Promise.resolve(quiz);
      if (id === userId) return Promise.resolve(user);
      return Promise.resolve(null);
    });

    const proof = { quiz_answers: [0, 1] }; // 100%
    const result = await TaskService.submit_task(userId, taskId, proof);
    expect(result.submission_status).toBe("APPROVED");
  });

  test("submit_task - Quiz Failure", async () => {
    const userId = "user123";
    const taskId = "task123";
    const quizId = "quiz123";

    const quiz = {
      _id: quizId,
      passing_score: 1.0,
      questions: [{ correct_option_index: 0 }, { correct_option_index: 1 }],
    };

    const task = {
      _id: taskId,
      frequency: "on_demand",
      verification_method: "QUIZ",
      base_points: 20,
      verification_criteria: { quiz_id: quizId },
    };

    mockFindById.mockImplementation((id) => {
      if (id === taskId) return Promise.resolve(task);
      if (id === quizId) return Promise.resolve(quiz);
      return Promise.resolve(null);
    });

    const proof = { quiz_answers: [0, 0] }; // 50%
    await expect(
      TaskService.submit_task(userId, taskId, proof),
    ).rejects.toThrow(/below passing score/);
  });

  // --- PHOTO ---
  test("submit_task - Photo Success (Pending)", async () => {
    const userId = "user123";
    const taskId = "task123";
    const task = {
      _id: taskId,
      frequency: "on_demand",
      verification_method: "PHOTO_UPLOAD",
      base_points: 30,
    };

    mockFindById.mockResolvedValueOnce(task);

    const proof = { photo_url: "/uploads/img.jpg" };
    const result = await TaskService.submit_task(userId, taskId, proof);

    expect(result.submission_status).toBe("PENDING");
    // Points should NOT be awarded yet
    expect(result.points_earned).toBeUndefined();
  });
});
