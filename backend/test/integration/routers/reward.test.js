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
    _get_all_badges: jest.fn().mockResolvedValue([]),
    initialize_badges: jest.fn().mockResolvedValue(),
  },
}));

const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../../app/app.js")).default;
const Reward = (await import("../../../app/models/reward.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const Operator = (await import("../../../app/models/operator.js")).default;
const UserReward = (await import("../../../app/models/user_reward.js")).default;

describe("Reward API Endpoints", () => {
  let citizenToken;
  let userId;

  beforeAll(async () => {
    await db.connect();
    process.env.SUPER_SECRET = "test-secret-key";
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  const createTestUser = async (points = 500) => {
    const user = new User({
      name: "Reward",
      surname: "Tester",
      email: "citizen@example.com",
      password: "StrongPassword123!",
      role: "citizen",
      points: points,
      is_active: true,
    });
    await user.save();
    userId = user._id;
    return jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  };

  const createAdminUser = async () => {
    const operator = new Operator({
      name: "Admin",
      surname: "Tester",
      email: "admin@example.com",
      password: "StrongPassword123!",
      role: "admin",
      is_active: true,
    });
    await operator.save();
    return jwt.sign(
      { email: operator.email, id: operator._id, role: operator.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  };

  const createReward = async (data = {}) => {
    const reward = new Reward({
      title: "Discount 10%",
      description: "Get 10% off",
      points_cost: 100,
      quantity_available: 10,
      active: true,
      valid_until: new Date(Date.now() + 86400000),
      ...data,
    });
    return await reward.save();
  };

  describe("GET /api/v1/rewards", () => {
    it("should return active rewards for logged-in user", async () => {
      citizenToken = await createTestUser();
      await createReward({ title: "Discount 10%" });
      await createReward({ title: "Free Coffee" });

      const response = await request(app)
        .get("/api/v1/rewards")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty("title");
    });

    it("should return 401 if unauthorized", async () => {
      const response = await request(app).get("/api/v1/rewards");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/rewards/:id/redeem", () => {
    it("should redeem reward successfully", async () => {
      citizenToken = await createTestUser(500);
      const reward = await createReward({
        points_cost: 100,
        quantity_available: 10,
      });

      const response = await request(app)
        .post(`/api/v1/rewards/${reward._id}/redeem`)
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Reward redeemed successfully");
      expect(response.body).toHaveProperty("points_remaining", 400);

      const updatedUser = await User.findById(userId);
      expect(updatedUser.points).toBe(400);

      const updatedReward = await Reward.findById(reward._id);
      expect(updatedReward.quantity_available).toBe(9);

      const userReward = await UserReward.findOne({
        user_id: userId,
        reward_id: reward._id,
      });
      expect(userReward).toBeTruthy();
    });

    it("should fail if insufficient points", async () => {
      citizenToken = await createTestUser(50); // Only 50 points
      const reward = await createReward({ points_cost: 100 });

      const response = await request(app)
        .post(`/api/v1/rewards/${reward._id}/redeem`)
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Insufficient points");
    });

    it("should fail if out of stock", async () => {
      citizenToken = await createTestUser(500);
      const reward = await createReward({ quantity_available: 0 });

      const response = await request(app)
        .post(`/api/v1/rewards/${reward._id}/redeem`)
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Reward is out of stock");
    });

    it("should fail if reward does not exist", async () => {
      citizenToken = await createTestUser(500);
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/v1/rewards/${nonExistentId}/redeem`)
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Reward not found");
    });
  });

  describe("GET /api/v1/rewards/my-rewards", () => {
    it("should return rewards redeemed by user", async () => {
      citizenToken = await createTestUser(500);
      const reward = await createReward();

      // Redeem to create UserReward
      await request(app)
        .post(`/api/v1/rewards/${reward._id}/redeem`)
        .set("x-access-token", citizenToken);

      const res = await request(app)
        .get("/api/v1/rewards/my-rewards")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].reward_id._id).toBe(reward._id.toString());
    });
  });

  describe("Admin Routes", () => {
    let adminToken;
    beforeEach(async () => {
      adminToken = await createAdminUser();
    });

    it("POST /api/v1/rewards - should create reward", async () => {
      const res = await request(app)
        .post("/api/v1/rewards")
        .set("x-access-token", adminToken)
        .send({
          title: "New Reward",
          description: "Desc",
          points_cost: 50,
          quantity_available: 5,
          active: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("New Reward");
    });

    it("GET /api/v1/rewards/all - should return all rewards", async () => {
      await createReward({ active: false });
      await createReward({ active: true });

      const res = await request(app)
        .get("/api/v1/rewards/all")
        .set("x-access-token", adminToken);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("PUT /api/v1/rewards/:id - should update reward", async () => {
      const reward = await createReward();
      const res = await request(app)
        .put(`/api/v1/rewards/${reward._id}`)
        .set("x-access-token", adminToken)
        .send({ title: "Updated Title" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
    });

    it("DELETE /api/v1/rewards/:id - should deactivate reward", async () => {
      const reward = await createReward({ active: true });
      const res = await request(app)
        .delete(`/api/v1/rewards/${reward._id}`)
        .set("x-access-token", adminToken);

      expect(res.status).toBe(200);

      const updated = await Reward.findById(reward._id);
      expect(updated.active).toBe(false);
    });

    it("should reject non-admin users", async () => {
      citizenToken = await createTestUser();
      const res = await request(app)
        .get("/api/v1/rewards/all")
        .set("x-access-token", citizenToken);

      expect(res.status).toBe(403);
    });
  });
});
