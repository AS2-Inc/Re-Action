import { jest } from "@jest/globals";
import * as db from "../../db_helper.js"; // Path relative to test/services/

// Mock BadgeService
const mockCheckAndAwardBadges = jest.fn();
const mockCheckLevelUp = jest.fn();

jest.unstable_mockModule("../../../app/services/badge_service.js", () => ({
  default: {
    checkAndAwardBadges: mockCheckAndAwardBadges,
    check_level_up: mockCheckLevelUp,
    on_points_updated: jest.fn().mockResolvedValue([]),
    on_task_completed: jest.fn().mockResolvedValue([]),
    on_streak_updated: jest.fn().mockResolvedValue([]),
    on_environmental_stats_updated: jest.fn().mockResolvedValue([]),
    _get_all_badges: jest.fn().mockResolvedValue([]),
    initialize_badges: jest.fn().mockResolvedValue(),
  },
}));

// Mock EmailService
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    sendActivationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

const Task = (await import("../../../app/models/task.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const Quiz = (await import("../../../app/models/quiz.js")).default;

const TaskService = await import("../../../app/services/task_service.js");

describe("TaskService Verification Logic", () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clear();
    mockCheckAndAwardBadges.mockClear();
  });

  afterAll(async () => {
    await db.close();
  });

  const createUser = async () => {
    const user = new User({
      name: "Verification",
      surname: "Tester",
      email: "verify@test.com",
      role: "citizen",
      is_active: true,
      points: 0,
      ambient: { co2_saved: 0, waste_recycled: 0, km_green: 0 },
    });
    return await user.save();
  };

  const createTask = async (data = {}) => {
    const task = new Task({
      title: "Verify Me",
      description: "Testing verification",
      category: "Mobility",
      difficulty: "Low",
      base_points: 10,
      frequency: "on_demand",
      verification_method: "GPS",
      impact_metrics: { co2_saved: 1 },
      ...data,
    });
    return await task.save();
  };

  // --- GPS ---
  test("submit_task - GPS Success", async () => {
    const user = await createUser();
    const task = await createTask({
      verification_method: "GPS",
      verification_criteria: {
        target_location: [40, -74],
        min_distance_meters: 100,
      },
      base_points: 10,
    });

    const proof = { gps_location: [40.0001, -74.0001] }; // Close enough
    const result = await TaskService.submit_task(user._id, task._id, proof);

    expect(result.submission_status).toBe("APPROVED");
    expect(result.points_earned).toBeGreaterThan(0);

    // Refresh user to check points
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.points).toBeGreaterThan(0);
  });

  test("submit_task - GPS Failure", async () => {
    const user = await createUser();
    const task = await createTask({
      verification_method: "GPS",
      verification_criteria: {
        target_location: [40, -74],
        min_distance_meters: 100,
      },
    });

    const proof = { gps_location: [41, -75] }; // Far away

    await expect(
      TaskService.submit_task(user._id, task._id, proof),
    ).rejects.toThrow(/Distance/);
  });

  // --- QR ---
  test("submit_task - QR Success", async () => {
    const user = await createUser();
    const task = await createTask({
      verification_method: "QR_SCAN",
      verification_criteria: { qr_code_secret: "SECRET" },
      base_points: 10,
    });

    const proof = { qr_code_data: "SECRET" };
    const result = await TaskService.submit_task(user._id, task._id, proof);
    expect(result.submission_status).toBe("APPROVED");
  });

  test("submit_task - QR Failure", async () => {
    const user = await createUser();
    const task = await createTask({
      verification_method: "QR_SCAN",
      verification_criteria: { qr_code_secret: "SECRET" },
    });

    const proof = { qr_code_data: "WRONG" };
    await expect(
      TaskService.submit_task(user._id, task._id, proof),
    ).rejects.toThrow(/Invalid QR Code/);
  });

  // --- QUIZ ---
  test("submit_task - Quiz Success", async () => {
    const user = await createUser();
    const quiz = new Quiz({
      title: "Test Quiz",
      passing_score: 0.5,
      questions: [
        { text: "Q1", options: ["A", "B"], correct_option_index: 0 },
        { text: "Q2", options: ["A", "B"], correct_option_index: 1 },
      ],
    });
    await quiz.save();

    const task = await createTask({
      verification_method: "QUIZ",
      base_points: 20,
      verification_criteria: { quiz_id: quiz._id },
    });

    const proof = { quiz_answers: [0, 1] }; // 100%
    const result = await TaskService.submit_task(user._id, task._id, proof);
    expect(result.submission_status).toBe("APPROVED");
  });

  test("submit_task - Quiz Failure", async () => {
    const user = await createUser();
    const quiz = new Quiz({
      title: "Test Quiz",
      passing_score: 1.0,
      questions: [
        { text: "Q1", options: ["A", "B"], correct_option_index: 0 },
        { text: "Q2", options: ["A", "B"], correct_option_index: 1 },
      ],
    });
    await quiz.save();

    const task = await createTask({
      verification_method: "QUIZ",
      base_points: 20,
      verification_criteria: { quiz_id: quiz._id },
    });

    const proof = { quiz_answers: [0, 0] }; // 50%
    await expect(
      TaskService.submit_task(user._id, task._id, proof),
    ).rejects.toThrow(/below passing score/);
  });

  // --- PHOTO ---
  test("submit_task - Photo Success (Pending)", async () => {
    const user = await createUser();
    const task = await createTask({
      verification_method: "PHOTO_UPLOAD",
      base_points: 30,
    });

    const proof = { photo_url: "/uploads/img.jpg" };
    const result = await TaskService.submit_task(user._id, task._id, proof);

    expect(result.submission_status).toBe("PENDING");
    expect(result.points_earned).toBeUndefined();
  });
});
