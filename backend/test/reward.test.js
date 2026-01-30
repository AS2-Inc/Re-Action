import { jest } from "@jest/globals";

// Define mocks BEFORE importing the app
jest.unstable_mockModule("../app/services/email_service.js", () => ({
  default: {
    sendActivationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

jest.unstable_mockModule("../app/services/badge_service.js", () => ({
  default: {
    on_points_updated: jest.fn().mockResolvedValue([]),
    on_task_completed: jest.fn().mockResolvedValue([]),
    on_streak_updated: jest.fn().mockResolvedValue([]),
    on_environmental_stats_updated: jest.fn().mockResolvedValue([]),
    _get_all_badges: jest.fn().mockResolvedValue([]),
    initialize_badges: jest.fn().mockResolvedValue(),
  },
}));

// Now import the app and other dependencies
const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../app/app.js")).default;
const Reward = (await import("../app/models/reward.js")).default;
const User = (await import("../app/models/user.js")).default;
const UserReward = (await import("../app/models/user_reward.js")).default;

// Mock the model methods
const mockRewardFind = jest.fn();
const mockRewardFindById = jest.fn();
const mockRewardSave = jest.fn();
const mockUserFindById = jest.fn();
const mockUserSave = jest.fn();
const mockUserRewardSave = jest.fn();
const mockUserRewardFind = jest.fn();

Reward.find = mockRewardFind;
Reward.findById = mockRewardFindById;
User.findById = mockUserFindById;
UserReward.find = mockUserRewardFind; // Corrected: UserReward.find

describe("Reward API Endpoints", () => {
  let citizenToken;

  beforeAll(() => {
    process.env.SUPER_SECRET = "test-secret-key";
    citizenToken = jwt.sign(
      { email: "citizen@example.com", id: "citizen123", role: "citizen" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRewardFind.mockReset();
    mockRewardFindById.mockReset();
    mockRewardSave.mockReset();
    mockUserFindById.mockReset();
    mockUserSave.mockReset();
    mockUserRewardSave.mockReset();
    mockUserRewardFind.mockReset();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("GET /api/v1/rewards", () => {
    it("should return active rewards for logged-in user", async () => {
      const mockRewards = [
        { _id: "r1", title: "Discount 10%", active: true },
        { _id: "r2", title: "Free Coffee", active: true },
      ];
      mockRewardFind.mockResolvedValue(mockRewards);

      const response = await request(app)
        .get("/api/v1/rewards")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(mockRewardFind).toHaveBeenCalled();
    });

    it("should return 401 if unauthorized", async () => {
      const response = await request(app).get("/api/v1/rewards");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/rewards/:id/redeem", () => {
    it("should redeem reward successfully", async () => {
      const mockReward = {
        _id: "r1",
        title: "Discount 10%",
        points_cost: 100,
        quantity_available: 10,
        active: true,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockUser = {
        _id: "citizen123",
        points: 500,
        save: jest.fn().mockResolvedValue(true),
      };

      mockRewardFindById.mockResolvedValue(mockReward);
      mockUserFindById.mockResolvedValue(mockUser);
      jest
        .spyOn(UserReward.prototype, "save")
        .mockResolvedValue({ _id: "ur1" });

      const response = await request(app)
        .post("/api/v1/rewards/r1/redeem")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Reward redeemed successfully");
      expect(mockUser.points).toBe(400); // 500 - 100
      expect(mockReward.quantity_available).toBe(9); // 10 - 1
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockReward.save).toHaveBeenCalled();
    });

    it("should fail if insufficient points", async () => {
      const mockReward = {
        _id: "r1",
        points_cost: 100,
        quantity_available: 10,
        active: true,
      };
      const mockUser = {
        _id: "citizen123",
        points: 50,
      };

      mockRewardFindById.mockResolvedValue(mockReward);
      mockUserFindById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/rewards/r1/redeem")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Insufficient points");
    });

    it("should fail if out of stock", async () => {
      const mockReward = {
        _id: "r1",
        quantity_available: 0,
        active: true,
      };

      mockRewardFindById.mockResolvedValue(mockReward);

      const response = await request(app)
        .post("/api/v1/rewards/r1/redeem")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Reward is out of stock");
    });
  });
});
