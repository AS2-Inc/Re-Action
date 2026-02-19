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
    getLevelThresholds: jest.fn().mockReturnValue([
      { level: "Cittadino Base", points: 0 },
      { level: "Cittadino Attivo", points: 100 },
      { level: "Cittadino Consapevole", points: 300 },
      { level: "Ambasciatore Sostenibile", points: 750 },
      { level: "Guerriero Verde", points: 1500 },
      { level: "Maestro della Sostenibilità", points: 3000 },
    ]),
  },
}));

const request = (await import("supertest")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../../app/app.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const Task = (await import("../../../app/models/task.js")).default;
const Submission = (await import("../../../app/models/submission.js")).default;
const Badge = (await import("../../../app/models/badge.js")).default;
const UserReward = (await import("../../../app/models/user_reward.js")).default;
const Reward = (await import("../../../app/models/reward.js")).default;
const Neighborhood = (await import("../../../app/models/neighborhood.js"))
  .default;
const UserTask = (await import("../../../app/models/user_task.js")).default;

describe("User Dashboard API Endpoints (RF3)", () => {
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

  const createTestNeighborhood = async () => {
    const neighborhood = new Neighborhood({
      name: "Centro",
      city: "Trento",
      base_points: 1500,
      ranking_position: 1,
    });
    await neighborhood.save();
    return neighborhood;
  };

  const createTestUser = async (neighborhood) => {
    const user = new User({
      name: "Dashboard",
      surname: "Tester",
      email: "dashboard@example.com",
      password: "StrongPassword123!",
      role: "citizen",
      is_active: true,
      neighborhood_id: neighborhood?._id,
      points: 250,
      level: "Cittadino Attivo",
      streak: 5,
      last_activity_date: new Date(),
      ambient: {
        co2_saved: 15.5,
        waste_recycled: 8.2,
        km_green: 42.3,
      },
    });
    await user.save();
    userId = user._id;
    return {
      user,
      token: jwt.sign(
        { email: user.email, id: user._id, role: "citizen" },
        process.env.SUPER_SECRET,
        { expiresIn: 86400 },
      ),
    };
  };

  const createTestBadge = async (name = "First Steps") => {
    const badge = new Badge({
      name,
      description: "Complete your first task",
      icon: "star",
      category: "Points",
      display_order: 1,
    });
    await badge.save();
    return badge;
  };

  const createTestTask = async () => {
    const task = new Task({
      title: "Walk 1km",
      description: "Walk at least 1 kilometer",
      category: "Mobility",
      difficulty: "Low",
      base_points: 10,
      verification_method: "GPS",
      frequency: "daily",
      impact_metrics: { co2_saved: 0.5, distance: 1 },
    });
    await task.save();
    return task;
  };

  const createTestSubmission = async (task, status = "APPROVED") => {
    const submission = new Submission({
      user_id: userId,
      task_id: task._id,
      status,
      points_awarded: task.base_points,
      completed_at: new Date(),
    });
    await submission.save();
    return submission;
  };

  const createTestReward = async () => {
    const reward = new Reward({
      title: "Coffee Discount",
      description: "10% off at local cafe",
      points_cost: 100,
      type: "COUPON",
      quantity_available: 50,
      active: true,
    });
    await reward.save();
    return reward;
  };

  const createTestUserReward = async (reward) => {
    const userReward = new UserReward({
      user_id: userId,
      reward_id: reward._id,
      unique_code: "ABC12345",
      redeemed_at: new Date(),
    });
    await userReward.save();
    return userReward;
  };

  describe("GET /api/v1/users/me/dashboard", () => {
    it("should return complete dashboard data for authenticated user", async () => {
      const neighborhood = await createTestNeighborhood();
      const { token, user } = await createTestUser(neighborhood);
      citizenToken = token;

      // Create test data
      const badge = await createTestBadge();
      user.badges_id = [badge._id];
      await user.save();

      const task = await createTestTask();
      await createTestSubmission(task);

      const reward = await createTestReward();
      await createTestUserReward(reward);

      // Create active task assignment
      const userTask = new UserTask({
        user_id: userId,
        task_id: task._id,
        status: "ASSIGNED",
        expires_at: new Date(Date.now() + 86400000),
      });
      await userTask.save();

      const res = await request(app)
        .get("/api/v1/users/me/dashboard")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.name).toBe("Dashboard");
      expect(res.body.user.points).toBe(250);
      expect(res.body.user.streak).toBe(5);

      expect(res.body).toHaveProperty("stats");
      expect(res.body.stats.tasks_completed).toBe(1);
      expect(res.body.stats.badges_count).toBe(1);

      expect(res.body).toHaveProperty("ambient");
      expect(res.body.ambient.co2_saved).toBe(15.5);

      expect(res.body).toHaveProperty("recent_badges");
      expect(res.body.recent_badges.length).toBe(1);
      expect(res.body.recent_badges[0].name).toBe("First Steps");

      expect(res.body).toHaveProperty("recent_rewards");
      expect(res.body.recent_rewards.length).toBe(1);
      expect(res.body.recent_rewards[0].title).toBe("Coffee Discount");

      expect(res.body).toHaveProperty("active_tasks");
      expect(res.body.active_tasks.length).toBe(1);

      expect(res.body).toHaveProperty("neighborhood");
      expect(res.body.neighborhood.name).toBe("Centro");
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/v1/users/me/dashboard");
      expect(res.status).toBe(401);
    });
  });
});
