import { jest } from "@jest/globals";
// Define mocks BEFORE importing the app
jest.unstable_mockModule("../app/services/email_service.js", () => ({
  default: {
    sendActivationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

jest.unstable_mockModule("../app/services/badgeService.js", () => ({
  default: {
    onPointsUpdated: jest.fn().mockResolvedValue([]),
    onTaskCompleted: jest.fn().mockResolvedValue([]),
    onStreakUpdated: jest.fn().mockResolvedValue([]),
    onEnvironmentalStatsUpdated: jest.fn().mockResolvedValue([]),
    _getAllBadges: jest.fn().mockResolvedValue([]),
    initializeBadges: jest.fn().mockResolvedValue(),
  },
}));

// Now import the app and other dependencies
const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const app = (await import("../app/app.js")).default;
const Neighborhood = (await import("../app/models/neighborhood.js")).default;

// Mock the Neighborhood model methods
const mockFind = jest.fn();
const mockFindById = jest.fn();

Neighborhood.find = mockFind;
Neighborhood.findById = mockFindById;

describe("Neighborhood API Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFind.mockReset();
    mockFindById.mockReset();
  });

  afterAll(async () => {
    // Close database connections if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("GET /api/v1/neighborhood", () => {
    it("should return all neighborhoods with status 200", async () => {
      const mockNeighborhoods = [
        {
          _id: "1",
          name: "Green Valley",
          city: "Portland",
          total_score: 100,
          environmental_data: {
            air_quality: 85,
            waste_management: 90,
          },
          goals: {
            target: 1000,
            deadline: "2024-12-31T00:00:00.000Z",
            reward: "Community Garden",
          },
        },
        {
          _id: "2",
          name: "Eco District",
          city: "Seattle",
          total_score: 150,
          environmental_data: {
            air_quality: 90,
            waste_management: 95,
          },
          goals: {
            target: 1500,
            deadline: "2024-12-31T00:00:00.000Z",
            reward: "Solar Panels",
          },
        },
      ];

      mockFind.mockResolvedValue(mockNeighborhoods);

      const response = await request(app).get("/api/v1/neighborhood");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNeighborhoods);
      expect(mockFind).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no neighborhoods exist", async () => {
      mockFind.mockResolvedValue([]);

      const response = await request(app).get("/api/v1/neighborhood");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(mockFind).toHaveBeenCalledTimes(1);
    });

    it("should return 500 when database error occurs", async () => {
      const errorMessage = "Database connection failed";
      mockFind.mockRejectedValue(new Error(errorMessage));

      const response = await request(app).get("/api/v1/neighborhood");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Internal Server Error");
      expect(response.body).toHaveProperty("details", errorMessage);
    });
  });

  describe("GET /api/v1/neighborhood/:id", () => {
    it("should return a neighborhood by id with status 200", async () => {
      const mockNeighborhood = {
        _id: "123",
        name: "Green Valley",
        city: "Portland",
        total_score: 100,
        environmental_data: {
          air_quality: 85,
          waste_management: 90,
        },
        goals: {
          target: 1000,
          deadline: "2024-12-31T00:00:00.000Z",
          reward: "Community Garden",
        },
      };

      mockFindById.mockResolvedValue(mockNeighborhood);

      const response = await request(app).get("/api/v1/neighborhood/123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockNeighborhood);
      expect(mockFindById).toHaveBeenCalledWith("123");
      expect(mockFindById).toHaveBeenCalledTimes(1);
    });

    it("should return 404 when neighborhood is not found", async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).get("/api/v1/neighborhood/999");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Neighborhood Not Found");
      expect(mockFindById).toHaveBeenCalledWith("999");
    });

    it("should return 500 when database error occurs", async () => {
      mockFindById.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/v1/neighborhood/123");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Internal Server Error");
    });

    it("should handle invalid id format", async () => {
      mockFindById.mockRejectedValue(new Error("Invalid ObjectId format"));

      const response = await request(app).get(
        "/api/v1/neighborhood/invalid-id",
      );

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Internal Server Error");
    });
  });

  describe("Route validation", () => {
    it("should match correct route pattern for listing neighborhoods", async () => {
      mockFind.mockResolvedValue([]);
      const response = await request(app).get("/api/v1/neighborhood");
      expect(response.status).not.toBe(404);
    });

    it("should match correct route pattern for getting neighborhood by id", async () => {
      mockFindById.mockResolvedValue({ _id: "123", name: "Test" });
      const response = await request(app).get("/api/v1/neighborhood/123");
      expect(response.status).not.toBe(404);
    });

    it("should return 404 for non-existent routes", async () => {
      const response = await request(app).get(
        "/api/v1/neighborhood/123/invalid",
      );
      expect(response.status).toBe(404);
    });
  });

  describe("Response format validation", () => {
    it("should return JSON content type for list endpoint", async () => {
      mockFind.mockResolvedValue([]);
      const response = await request(app).get("/api/v1/neighborhood");
      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return JSON content type for get by id endpoint", async () => {
      const mockNeighborhood = {
        _id: "123",
        name: "Green Valley",
        city: "Portland",
      };
      mockFindById.mockResolvedValue(mockNeighborhood);
      const response = await request(app).get("/api/v1/neighborhood/123");
      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return valid error JSON structure on errors", async () => {
      mockFind.mockRejectedValue(new Error("DB Error"));
      const response = await request(app).get("/api/v1/neighborhood");
      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });
  });
});
