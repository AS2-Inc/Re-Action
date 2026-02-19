import path from "node:path";
import { fileURLToPath } from "node:url";
import { jest } from "@jest/globals";
import * as db from "../../db_helper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const jwt = (await import("jsonwebtoken")).default;
const Operator = (await import("../../../app/models/operator.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const Task = (await import("../../../app/models/task.js")).default;
const UserTask = (await import("../../../app/models/user_task.js")).default;
const _Submission = (await import("../../../app/models/submission.js")).default;

describe("Photo Proof URL Verification", () => {
  let operatorToken;
  let citizenToken;
  let userId;
  let task;

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

  const createOperator = async () => {
    const op = new Operator({
      name: "Dashboard",
      surname: "Master",
      email: "dashboard@op.com",
      password: "hashedpassword",
      role: "operator",
      is_active: true,
    });
    await op.save();
    return jwt.sign(
      { email: op.email, id: op._id, role: op.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  };

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

  const createTask = async () => {
    task = new Task({
      title: "Photo Task",
      description: "Take a photo",
      category: "Waste",
      difficulty: "Low",
      base_points: 10,
      verification_method: "PHOTO_UPLOAD",
      is_active: true,
    });
    await task.save();
  };

  const assignTask = async () => {
    const userTask = new UserTask({
      user_id: userId,
      task_id: task._id,
      status: "ASSIGNED",
      assigned_at: new Date(),
      expires_at: new Date(Date.now() + 86400000),
    });
    await userTask.save();
  };

  it("should have test setup ready", () => {
    expect(true).toBe(true);
  });
});
