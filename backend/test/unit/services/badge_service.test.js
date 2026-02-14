import { jest } from "@jest/globals";

// Define mocks
const mockUserFindById = jest.fn();
const mockUserSave = jest.fn();
const mockBadgeFind = jest.fn();
const mockBadgeFindOneAndUpdate = jest.fn();
const mockActivityFind = jest.fn();

// Mock dependencies
const MockUser = jest.fn(() => ({ save: mockUserSave }));
MockUser.findById = mockUserFindById;

const MockBadge = jest.fn();
MockBadge.find = mockBadgeFind;
MockBadge.findOneAndUpdate = mockBadgeFindOneAndUpdate;

const MockActivity = jest.fn();
MockActivity.find = mockActivityFind;

jest.unstable_mockModule("../../../app/models/user.js", () => ({
  default: MockUser,
}));
jest.unstable_mockModule("../../../app/models/badge.js", () => ({
  default: MockBadge,
}));
jest.unstable_mockModule("../../../app/models/submission.js", () => ({
  default: MockActivity,
}));

// Import Module Under Test
const BadgeService = (await import("../../../app/services/badge_service.js"))
  .default;

describe("BadgeService (Unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initializeDefaultBadges", () => {
    it("should initialize badges", async () => {
      await BadgeService.initializeDefaultBadges();
      expect(mockBadgeFindOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe("checkAndAwardBadges", () => {
    it("should award badges if requirements met", async () => {
      const mockUser = {
        _id: "user-1",
        points: 100,
        streak: 5,
        badges_id: [],
        ambient: { co2_saved: 100 },
        save: mockUserSave,
      };
      mockUserFindById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      // Mock Badges
      const mockBadges = [
        {
          _id: "badge-1",
          name: "Streak Master",
          requirements: { min_streak: 5 },
        },
        {
          _id: "badge-2",
          name: "Co2 Saver",
          requirements: { min_co2_saved: 200 }, // Not met
        },
      ];
      mockBadgeFind.mockResolvedValue(mockBadges);

      // Mock Activities
      mockActivityFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const newBadges = await BadgeService.checkAndAwardBadges("user-1");

      expect(newBadges).toHaveLength(1);
      expect(newBadges[0].name).toBe("Streak Master");
      expect(mockUser.badges_id).toContain("badge-1");
      expect(mockUserSave).toHaveBeenCalled();
    });

    it("should not re-award existing badges", async () => {
      const mockUser = {
        _id: "user-1",
        badges_id: [{ _id: "badge-1", toString: () => "badge-1" }],
        save: mockUserSave,
      };
      mockUserFindById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });

      mockBadgeFind.mockResolvedValue([{ _id: "badge-1", requirements: {} }]);
      mockActivityFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const newBadges = await BadgeService.checkAndAwardBadges("user-1");
      expect(newBadges).toHaveLength(0);
    });
  });

  describe("getAllBadgesWithStatus", () => {
    it("should return badges with earned status", async () => {
      const mockUser = {
        _id: "user-1",
        badges_id: ["badge-1"],
      };
      mockUserFindById.mockResolvedValue(mockUser);

      const mockBadges = [
        { _id: "badge-1", name: "B1", toObject: () => ({ name: "B1" }) },
        { _id: "badge-2", name: "B2", toObject: () => ({ name: "B2" }) },
      ];
      mockBadgeFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockBadges),
      });

      const result = await BadgeService.getAllBadgesWithStatus("user-1");

      expect(result[0].earned).toBe(true);
      expect(result[1].earned).toBe(false);
    });
  });
});
