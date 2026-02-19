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
      active_goals: [
        {
          description: "Plant 100 trees",
          target_points: 5000,
          current_points: 2000,
          is_completed: false,
        },
      ],
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
      expect(res.body.neighborhood.active_goals.length).toBe(1);
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/v1/users/me/dashboard");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/users/me/history", () => {
    it("should return paginated action history", async () => {
      const { token } = await createTestUser();
      citizenToken = token;

      // Create multiple submissions
      for (let i = 0; i < 5; i++) {
        const task = await createTestTask();
        await createTestSubmission(task);
      }

      const reward = await createTestReward();
      await createTestUserReward(reward);

      const res = await request(app)
        .get("/api/v1/users/me/history")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.items.length).toBe(6); // 5 tasks + 1 reward
      expect(res.body.pagination.total).toBe(6);
    });

    it("should filter history by type", async () => {
      const { token } = await createTestUser();
      citizenToken = token;

      const task = await createTestTask();
      await createTestSubmission(task);

      const reward = await createTestReward();
      await createTestUserReward(reward);

      const res = await request(app)
        .get("/api/v1/users/me/history?type=tasks")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].type).toBe("task_completed");
    });

    it("should respect pagination parameters", async () => {
      const { token } = await createTestUser();
      citizenToken = token;

      for (let i = 0; i < 10; i++) {
        const task = await createTestTask();
        await createTestSubmission(task);
      }

      const res = await request(app)
        .get("/api/v1/users/me/history?page=2&limit=3")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(3);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(3);
      expect(res.body.pagination.total).toBe(10);
      expect(res.body.pagination.total_pages).toBe(4);
    });
  });

  describe("GET /api/v1/users/me/stats", () => {
    it("should return aggregated user statistics", async () => {
      const { token } = await createTestUser();
      citizenToken = token;

      // Create tasks in different categories
      const mobilityTask = new Task({
        title: "Walk",
        category: "Mobility",
        difficulty: "Low",
        base_points: 10,
        verification_method: "GPS",
        frequency: "daily",
      });
      await mobilityTask.save();

      const wasteTask = new Task({
        title: "Recycle",
        category: "Waste",
        difficulty: "Medium",
        base_points: 20,
        verification_method: "PHOTO_UPLOAD",
        frequency: "daily",
      });
      await wasteTask.save();

      await createTestSubmission(mobilityTask);
      await createTestSubmission(mobilityTask);
      await createTestSubmission(wasteTask);

      const res = await request(app)
        .get("/api/v1/users/me/stats")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tasks_by_category");
      expect(res.body.tasks_by_category.Mobility).toBe(2);
      expect(res.body.tasks_by_category.Waste).toBe(1);

      expect(res.body).toHaveProperty("ambient");
      expect(res.body).toHaveProperty("streak");
      expect(res.body.streak.current).toBe(5);
    });
  });
});
