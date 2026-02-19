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
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../../app/app.js")).default;
const Task = (await import("../../../app/models/task.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const UserTask = (await import("../../../app/models/user_task.js")).default;
const Neighborhood = (await import("../../../app/models/neighborhood.js"))
  .default;

describe("Impact Metrics Accumulation", () => {
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
    const neighborhood = new Neighborhood({
      name: "Test Neighborhood",
      city: "Test City",
      environmental_data: { co2_saved: 0, waste_recycled: 0, km_green: 0 },
    });
    await neighborhood.save();

    const user = new User({
      name: "Impact",
      surname: "Tester",
      email: "impact@example.com",
      password: "StrongPassword123!",
      role: "citizen",
      is_active: true,
      neighborhood_id: neighborhood._id,
      ambient: {
        co2_saved: 0,
        waste_recycled: 0,
        km_green: 0,
      },
    });
    await user.save();
    userId = user._id;
    return {
      token: jwt.sign(
        { email: user.email, id: user._id, role: user.role },
        process.env.SUPER_SECRET,
        { expiresIn: 86400 },
      ),
      neighborhoodId: neighborhood._id,
    };
  };

  const createTask = async (metrics) => {
    const task = new Task({
      title: "Green Task",
      category: "Mobility",
      difficulty: "Low",
      base_points: 10,
      impact_metrics: metrics,
      verification_method: "GPS",
      verification_criteria: {
        target_location: [45.4642, 9.19],
        min_distance_meters: 100,
      },
      frequency: "daily",
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

  it("should accumulate km_green, co2_saved, and waste_recycled upon task completion", async () => {
    const { token, neighborhoodId } = await createTestUser();
    citizenToken = token;

    const metrics = {
      co2_saved: 2.5,
      waste_recycled: 1.0,
      km_green: 5.2,
    };

    const task = await createTask(metrics);
    await assignTask(task._id);

    // Submit verification
    const res = await request(app)
      .post("/api/v1/tasks/submit")
      .set("x-access-token", citizenToken)
      .send({
        task_id: task._id,
        proof: { gps_location: [45.4642, 9.19] }, // Valid location close to target
      });

    expect(res.status).toBe(200);
    expect(res.body.submission_status).toBe("APPROVED");

    // Check user stats
    const updatedUser = await User.findById(userId);
    expect(updatedUser.points).toBeGreaterThan(0); // Should be at least base_points (10)
    expect(updatedUser.ambient.co2_saved).toBeCloseTo(2.5);
    expect(updatedUser.ambient.waste_recycled).toBeCloseTo(1.0);
    expect(updatedUser.ambient.km_green).toBeCloseTo(5.2);

    // Check neighborhood stats
    const updatedNeighborhood = await Neighborhood.findById(neighborhoodId);
    expect(updatedNeighborhood.base_points).toBeGreaterThan(0); // Should be updated
    expect(updatedNeighborhood.environmental_data.co2_saved).toBeCloseTo(2.5);
    expect(updatedNeighborhood.environmental_data.waste_recycled).toBeCloseTo(
      1.0,
    );
    expect(updatedNeighborhood.environmental_data.km_green).toBeCloseTo(5.2);
  });
});
