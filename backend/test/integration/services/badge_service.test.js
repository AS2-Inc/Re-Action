import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { DEFAULT_BADGES } from "../../../app/config/badges.config.js";
import Badge from "../../../app/models/badge.js";
import Activity from "../../../app/models/submission.js";
import Task from "../../../app/models/task.js";
import User from "../../../app/models/user.js";
import BadgeService from "../../../app/services/badge_service.js";
import { clear, close, connect } from "../../db_helper.js";

describe("BadgeService", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clear();
  });

  afterAll(async () => {
    await close();
  });

  describe("initializeDefaultBadges", () => {
    it("should initialize default badges in the database", async () => {
      await BadgeService.initializeDefaultBadges();
      const badges = await Badge.find({});
      expect(badges.length).toBe(DEFAULT_BADGES.length);

      const badgeNames = badges.map((b) => b.name);
      expect(badgeNames).toContain("Nuovo Arrivato");
      expect(badgeNames).toContain("Cittadino Attivo");
    });

    it("should not create duplicates if run multiple times", async () => {
      await BadgeService.initializeDefaultBadges();
      await BadgeService.initializeDefaultBadges();
      const badges = await Badge.find({});
      expect(badges.length).toBe(DEFAULT_BADGES.length);
    });
  });

  describe("checkAndAwardBadges", () => {
    let user;

    beforeEach(async () => {
      await BadgeService.initializeDefaultBadges();
      user = await User.create({
        username: "testuser",
        email: "test@example.com",
        password: "Password123!",
        points: 0,
        level: "Cittadino Base",
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
      });
    });

    it("should award 'Nuovo Arrivato' badge when points reach 100", async () => {
      user.points = 100;
      await user.save();

      const newBadges = await BadgeService.checkAndAwardBadges(user._id);

      expect(newBadges.length).toBe(1);
      expect(newBadges[0].name).toBe("Nuovo Arrivato");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.badges_id.length).toBe(1);
      expect(updatedUser.level).toBe("Nuovo Arrivato");
    });

    it("should award 'Primo Passo' badge after first task completion", async () => {
      // Create a real task and activity
      const task = await Task.create({
        title: "Test Task",
        description: "A test task",
        category: "Mobility",
        points: 10,
        base_points: 10,
        verification_method: "GPS",
        difficulty: "Low",
      });

      await Activity.create({
        user_id: user._id,
        task_id: task._id,
        status: "APPROVED",
      });

      const newBadges = await BadgeService.checkAndAwardBadges(user._id);
      const awardedNames = newBadges.map((b) => b.name);
      expect(awardedNames).toContain("Primo Passo");
    });

    it("should not re-award existing badges", async () => {
      user.points = 100;
      await user.save();

      await BadgeService.checkAndAwardBadges(user._id);
      const newBadgesSecondRun = await BadgeService.checkAndAwardBadges(
        user._id,
      );

      expect(newBadgesSecondRun.length).toBe(0);
    });

    it("should update user level based on points", async () => {
      user.points = 5000;
      await user.save();
      await BadgeService.checkAndAwardBadges(user._id);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.level).toBe("King della Sostenibilità");
    });
  });

  describe("getAllBadgesWithStatus", () => {
    it("should return all badges with earned status", async () => {
      await BadgeService.initializeDefaultBadges();
      const user = await User.create({
        username: "testuser2",
        email: "test2@example.com",
        password: "Password123!",
      });

      // Manually assign a badge
      const badge = await Badge.findOne({ name: "Nuovo Arrivato" });
      user.badges_id.push(badge._id);
      await user.save();

      const badgesWithStatus = await BadgeService.getAllBadgesWithStatus(
        user._id,
      );

      const earnedBadge = badgesWithStatus.find(
        (b) => b.name === "Nuovo Arrivato",
      );
      const unearnedBadge = badgesWithStatus.find(
        (b) => b.name === "Cittadino Attivo",
      );

      expect(earnedBadge.earned).toBe(true);
      expect(unearnedBadge.earned).toBe(false);
    });

    it("should throw error if user not found", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await expect(
        BadgeService.getAllBadgesWithStatus(new mongoose.Types.ObjectId()),
      ).rejects.toThrow("User not found");
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getUserBadges", () => {
    it("should return only user's badges", async () => {
      await BadgeService.initializeDefaultBadges();
      const user = await User.create({
        username: "testuser3",
        email: "test3@example.com",
        password: "Password123!",
      });

      const badge = await Badge.findOne({ name: "Nuovo Arrivato" });
      user.badges_id.push(badge._id);
      await user.save();

      const userBadges = await BadgeService.getUserBadges(user._id);
      expect(userBadges.length).toBe(1);
      expect(userBadges[0].name).toBe("Nuovo Arrivato");
    });
  });
});
