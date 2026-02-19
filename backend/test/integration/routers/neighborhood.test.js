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
const app = (await import("../../../app/app.js")).default;
const Neighborhood = (await import("../../../app/models/neighborhood.js"))
  .default;

describe("Neighborhood API Endpoints", () => {
  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  const createNeighborhood = async (data = {}) => {
    const neighborhood = new Neighborhood({
      name: "Green Valley",
      city: "Portland",
      base_points: 100,
      environmental_data: {
        air_quality: 85,
        waste_management: 90,
      },
      goals: {
        target: 1000,
        deadline: new Date("2024-12-31T00:00:00.000Z"),
        reward: "Community Garden",
      },
      ...data,
    });
    return await neighborhood.save();
  };

  describe("GET /api/v1/neighborhood", () => {
    it("should return all neighborhoods with status 200", async () => {
      await createNeighborhood({ name: "Green Valley", city: "Portland" });
      await createNeighborhood({ name: "Eco District", city: "Seattle" });

      const response = await request(app).get("/api/v1/neighborhood");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty("name");
      expect(response.body[0]).toHaveProperty("city");
    });

    it("should return empty array when no neighborhoods exist", async () => {
      const response = await request(app).get("/api/v1/neighborhood");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/v1/neighborhood/:id", () => {
    it("should return a neighborhood by id with status 200", async () => {
      const neighborhood = await createNeighborhood();

      const response = await request(app).get(
        `/api/v1/neighborhood/${neighborhood._id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Green Valley");
      expect(response.body).toHaveProperty("_id", neighborhood._id.toString());
    });

    it("should return 404 when neighborhood is not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).get(
        `/api/v1/neighborhood/${nonExistentId}`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Neighborhood Not Found");
    });

    it("should handle invalid id format", async () => {
      const response = await request(app).get(
        "/api/v1/neighborhood/invalid-id",
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid ID");
    });
  });

  describe("Route validation", () => {
    it("should match correct route pattern for listing neighborhoods", async () => {
      const response = await request(app).get("/api/v1/neighborhood");
      expect(response.status).toBe(200);
    });

    it("should match correct route pattern for getting neighborhood by id", async () => {
      const neighborhood = await createNeighborhood();
      const response = await request(app).get(
        `/api/v1/neighborhood/${neighborhood._id}`,
      );
      expect(response.status).toBe(200);
    });

    it("should return 404 for non-existent routes", async () => {
      const neighborhood = await createNeighborhood();
      const response = await request(app).get(
        `/api/v1/neighborhood/${neighborhood._id}/invalid`,
      );
      expect(response.status).toBe(404);
    });
  });

  describe("Response format validation", () => {
    it("should return JSON content type for list endpoint", async () => {
      const response = await request(app).get("/api/v1/neighborhood");
      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return JSON content type for get by id endpoint", async () => {
      const neighborhood = await createNeighborhood();
      const response = await request(app).get(
        `/api/v1/neighborhood/${neighborhood._id}`,
      );
      expect(response.headers["content-type"]).toMatch(/json/);
    });
  });
});
