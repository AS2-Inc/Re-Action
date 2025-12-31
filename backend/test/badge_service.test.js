import { jest } from "@jest/globals";
import badgeService from "../app/services/badge_service.js";
import Badge from "../app/models/badge.js";
import User from "../app/models/user.js";
import Activity from "../app/models/activity.js";

// Mock the models
jest.mock("../app/models/badge.js");
jest.mock("../app/models/user.js");
jest.mock("../app/models/activity.js");

describe("BadgeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe("initializeDefaultBadges", () => {
    it("should initialize all default badges", async () => {
      Badge.findOneAndUpdate = jest.fn().mockResolvedValue({});

      await badgeService.initializeDefaultBadges();

      // Should have called findOneAndUpdate for each default badge (17 badges)
      expect(Badge.findOneAndUpdate).toHaveBeenCalledTimes(17);

      // Check that King della Sostenibilità badge was created
      expect(Badge.findOneAndUpdate).toHaveBeenCalledWith(
        { name: "King della Sostenibilità" },
        expect.objectContaining({
          name: "King della Sostenibilità",
          icon: "👑",
          category: "Points",
          requirements: { min_points: 5000 },
          rarity: "Legendary",
        }),
        { upsert: true, new: true },
      );
    });

    it("should handle errors gracefully", async () => {
      Badge.findOneAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error("DB Error"));

      await badgeService.initializeDefaultBadges();

      expect(console.error).toHaveBeenCalledWith(
        "❌ Error initializing badges:",
        expect.any(Error),
      );
    });
  });

  describe("checkAndAwardBadges", () => {
    it("should throw error if user not found", async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      const result = await badgeService.checkAndAwardBadges("invalid-user-id");

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it("should award badge based on points threshold", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 150,
        level: "Cittadino Base",
        streak: 0,
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Nuovo Arrivato",
          requirements: { min_points: 100 },
          toObject: function () {
            return this;
          },
        },
        {
          _id: "badge2",
          name: "Cittadino Attivo",
          requirements: { min_points: 500 },
          toObject: function () {
            return this;
          },
        },
      ];

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue(mockBadges);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const newBadges = await badgeService.checkAndAwardBadges("user123");

      // User with 150 points should get "Nuovo Arrivato" badge (100 pts)
      expect(newBadges).toHaveLength(1);
      expect(newBadges[0].name).toBe("Nuovo Arrivato");
      expect(mockUser.badges_id).toContain("badge1");
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should award badge based on task completion", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 50,
        level: "Cittadino Base",
        streak: 0,
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Primo Passo",
          requirements: { min_tasks_completed: 1 },
          toObject: function () {
            return this;
          },
        },
      ];

      const mockActivities = [
        {
          user_id: "user123",
          task_id: { _id: "task1", category: "Mobility" },
          status: "APPROVED",
        },
      ];

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue(mockBadges);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActivities),
      });

      const newBadges = await badgeService.checkAndAwardBadges("user123");

      expect(newBadges).toHaveLength(1);
      expect(newBadges[0].name).toBe("Primo Passo");
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should award badge based on category-specific tasks", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 500,
        level: "Cittadino Base",
        streak: 0,
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Mobilità Verde",
          requirements: { tasks_by_category: { Mobility: 15 } },
          toObject: function () {
            return this;
          },
        },
      ];

      // Create 15 mobility tasks
      const mockActivities = Array.from({ length: 15 }, (_, i) => ({
        user_id: "user123",
        task_id: { _id: `task${i}`, category: "Mobility" },
        status: "APPROVED",
      }));

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue(mockBadges);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActivities),
      });

      const newBadges = await badgeService.checkAndAwardBadges("user123");

      expect(newBadges).toHaveLength(1);
      expect(newBadges[0].name).toBe("Mobilità Verde");
    });

    it("should award badge based on streak", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 100,
        level: "Cittadino Base",
        streak: 10,
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Costanza Premiata",
          requirements: { min_streak: 7 },
          toObject: function () {
            return this;
          },
        },
      ];

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue(mockBadges);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const newBadges = await badgeService.checkAndAwardBadges("user123");

      expect(newBadges).toHaveLength(1);
      expect(newBadges[0].name).toBe("Costanza Premiata");
    });

    it("should award badge based on environmental metrics", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 200,
        level: "Cittadino Base",
        streak: 0,
        badges_id: [],
        ambient: {
          co2_saved: 75,
          waste_recycled: 120,
          km_green: 150,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Salvatore del Clima",
          requirements: { min_co2_saved: 50 },
          toObject: function () {
            return this;
          },
        },
        {
          _id: "badge2",
          name: "Campione del Riciclo",
          requirements: { min_waste_recycled: 100 },
          toObject: function () {
            return this;
          },
        },
        {
          _id: "badge3",
          name: "Maratoneta Verde",
          requirements: { min_km_green: 100 },
          toObject: function () {
            return this;
          },
        },
      ];

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue(mockBadges);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const newBadges = await badgeService.checkAndAwardBadges("user123");

      // Should award all three environmental badges
      expect(newBadges).toHaveLength(3);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should not award badge if user already has it", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 150,
        level: "Nuovo Arrivato",
        streak: 0,
        badges_id: [{ _id: "badge1" }],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Nuovo Arrivato",
          requirements: { min_points: 100 },
          toObject: function () {
            return this;
          },
        },
      ];

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue(mockBadges);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const newBadges = await badgeService.checkAndAwardBadges("user123");

      expect(newBadges).toHaveLength(0);
    });

    it("should update user level based on points", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 5500,
        level: "Cittadino Base",
        streak: 0,
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue([]);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      await badgeService.checkAndAwardBadges("user123");

      expect(mockUser.level).toBe("King della Sostenibilità");
    });

    it("should handle mixed category tasks correctly", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        points: 500,
        level: "Cittadino Base",
        streak: 0,
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Mobilità Verde",
          requirements: { tasks_by_category: { Mobility: 10 } },
          toObject: function () {
            return this;
          },
        },
        {
          _id: "badge2",
          name: "Guardiano dei Rifiuti",
          requirements: { tasks_by_category: { Waste: 10 } },
          toObject: function () {
            return this;
          },
        },
      ];

      // 8 Mobility + 12 Waste tasks
      const mockActivities = [
        ...Array.from({ length: 8 }, (_, i) => ({
          user_id: "user123",
          task_id: { _id: `mobility${i}`, category: "Mobility" },
          status: "APPROVED",
        })),
        ...Array.from({ length: 12 }, (_, i) => ({
          user_id: "user123",
          task_id: { _id: `waste${i}`, category: "Waste" },
          status: "APPROVED",
        })),
      ];

      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      Badge.find = jest.fn().mockResolvedValue(mockBadges);

      Activity.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockActivities),
      });

      const newBadges = await badgeService.checkAndAwardBadges("user123");

      // Should only get Waste badge (12 tasks), not Mobility (only 8)
      expect(newBadges).toHaveLength(1);
      expect(newBadges[0].name).toBe("Guardiano dei Rifiuti");
    });
  });

  describe("getAllBadgesWithStatus", () => {
    it("should return all badges with earned status", async () => {
      const mockUser = {
        _id: "user123",
        badges_id: ["badge1", "badge3"],
      };

      const mockBadges = [
        {
          _id: "badge1",
          name: "Badge 1",
          toObject: function () {
            return { _id: this._id, name: this.name };
          },
        },
        {
          _id: "badge2",
          name: "Badge 2",
          toObject: function () {
            return { _id: this._id, name: this.name };
          },
        },
        {
          _id: "badge3",
          name: "Badge 3",
          toObject: function () {
            return { _id: this._id, name: this.name };
          },
        },
      ];

      User.findById = jest.fn().mockResolvedValue(mockUser);

      Badge.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockBadges),
      });

      const result = await badgeService.getAllBadgesWithStatus("user123");

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("earned", true); // badge1
      expect(result[1]).toHaveProperty("earned", false); // badge2
      expect(result[2]).toHaveProperty("earned", true); // badge3
    });

    it("should handle user not found", async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      const result = await badgeService.getAllBadgesWithStatus("invalid-user");

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      User.findById = jest.fn().mockRejectedValue(new Error("DB Error"));

      const result = await badgeService.getAllBadgesWithStatus("user123");

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
