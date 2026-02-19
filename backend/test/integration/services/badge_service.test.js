import { jest } from "@jest/globals";
import mongoose from "mongoose";
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

  describe("checkAndAwardBadges", () => {
    let user;

    beforeEach(async () => {
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

    it("should award 'Primo Passo' badge after first task completion", async () => {
      // Create the "Primo Passo" badge with the requirement of completing 1 task
      const badge = await Badge.create({
        name: "Primo Passo",
        description: "First step in your journey",
        icon: "primo_passo.png",
        category: "Tasks",
        requirements: { min_tasks_completed: 1 },
      });

      const task = await Task.create({
        title: "Badge Test Task",
        description: "A test task for badge",
        category: "Waste",
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

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.badges_id.length).toBeGreaterThanOrEqual(1);
    });

    it("should not re-award existing badges", async () => {
      // Create the badge that will be awarded
      const badge = await Badge.create({
        name: "Primo Passo",
        description: "First step in your journey",
        icon: "primo_passo.png",
        category: "Tasks",
        requirements: { min_tasks_completed: 1 },
      });

      const task = await Task.create({
        title: "Re-award Test",
        description: "Test",
        category: "Mobility",
        base_points: 10,
        verification_method: "GPS",
        difficulty: "Low",
      });

      await Activity.create({
        user_id: user._id,
        task_id: task._id,
        status: "APPROVED",
      });

      await BadgeService.checkAndAwardBadges(user._id);
      const newBadgesSecondRun = await BadgeService.checkAndAwardBadges(
        user._id,
      );

      expect(newBadgesSecondRun.length).toBe(0);
    });

    it("should update user level based on points", async () => {
      user.points = 1000;
      await user.save();
      await BadgeService.checkAndAwardBadges(user._id);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.level).toBe("Ambasciatore Sostenibile");
    });
  });

  describe("getAllBadgesWithStatus", () => {
    it("should return all badges with earned status", async () => {
      // Create test badges
      const badge1 = await Badge.create({
        name: "Primo Passo",
        description: "First step",
        icon: "icon1.png",
        category: "Tasks",
        requirements: { min_tasks_completed: 1 },
      });
      const badge2 = await Badge.create({
        name: "Operatore di Successo",
        description: "Success operator",
        icon: "icon2.png",
        category: "Points",
        requirements: { min_points: 500 },
      });

      const user = await User.create({
        username: "testuser2",
        email: "test2@example.com",
        password: "Password123!",
      });

      // Manually assign a badge
      user.badges_id.push(badge1._id);
      await user.save();

      const badgesWithStatus = await BadgeService.getAllBadgesWithStatus(
        user._id,
      );

      const earnedBadge = badgesWithStatus.find(
        (b) => b.name === "Primo Passo",
      );
      const unearnedBadge = badgesWithStatus.find(
        (b) => b.name === "Operatore di Successo",
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
      // Create test badge
      const badge = await Badge.create({
        name: "Primo Passo",
        description: "First step",
        icon: "icon1.png",
        category: "Tasks",
        requirements: { min_tasks_completed: 1 },
      });

      const user = await User.create({
        username: "testuser3",
        email: "test3@example.com",
        password: "Password123!",
      });

      user.badges_id.push(badge._id);
      await user.save();

      const userBadges = await BadgeService.getUserBadges(user._id);
      expect(userBadges.length).toBe(1);
      expect(userBadges[0].name).toBe("Primo Passo");
    });
  });
});
