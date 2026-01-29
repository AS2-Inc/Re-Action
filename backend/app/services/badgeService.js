import { BADGE_CATEGORIES, DEFAULT_BADGES } from "../config/badges.config.js";
import Badge from "../models/badge.js";

// Service to handle badge logic
// Source of Truth: The Database.
// Config is used ONLY for initial seeding.

class BadgeService {
  constructor() {
    this.badgesCache = null;
    this.initPromise = this.initializeBadges();
  }

  /**
   * Initializes the badges in the database from the config if they don't exist.
   * Also populates the in-memory cache.
   */
  async initializeBadges() {
    try {
      const count = await Badge.countDocuments();
      if (count === 0) {
        console.log("🌱 Seeding badges from config...");
        await Badge.insertMany(DEFAULT_BADGES);
        console.log("✅ Badges seeded.");
      }
      // Load all badges into cache for runtime efficiency
      this.badgesCache = await Badge.find({});
    } catch (error) {
      console.error("❌ Error initializing badges:", error);
      this.badgesCache = []; // Fallback to empty to prevent crashes
    }
  }

  /**
   * Helper: Ensure initialization is complete and return all badges
   */
  async _getAllBadges() {
    if (!this.badgesCache || this.badgesCache.length === 0) {
      await this.initializeBadges();
    }
    return this.badgesCache;
  }

  /**
   * Helper: Add badge to user if they don't have it
   */
  async _awardBadge(user, badge) {
    // Check if user already has this specific badge
    const hasBadge = user.badges_id.some(
      (b) => b.toString() === badge._id.toString(),
    );

    if (!hasBadge) {
      user.badges_id.push(badge._id);
      console.log(`🎖️ Badge "${badge.name}" awarded to user ${user.email}`);
      return badge;
    }
    return null;
  }

  /**
   * EVENT: Points Updated
   */
  async onPointsUpdated(user) {
    const allBadges = await this._getAllBadges();
    const pointBadges = allBadges.filter(
      (b) => b.category === BADGE_CATEGORIES.POINTS,
    );
    const newBadges = [];

    for (const badge of pointBadges) {
      if (badge.requirements?.min_points !== undefined) {
        if (user.points >= badge.requirements.min_points) {
          const awarded = await this._awardBadge(user, badge);
          if (awarded) newBadges.push(awarded);
        }
      }
    }
    return newBadges;
  }

  /**
   * EVENT: Task Completed
   */
  async onTaskCompleted(user, task) {
    // 1. Update User Stats
    if (!user.stats) {
      user.stats = { total_tasks_completed: 0, tasks_by_category: new Map() };
    }

    // Increment total
    user.stats.total_tasks_completed =
      (user.stats.total_tasks_completed || 0) + 1;

    // Increment Category
    const category = task.category;
    const currentCatCount = user.stats.tasks_by_category.get(category) || 0;
    user.stats.tasks_by_category.set(category, currentCatCount + 1);

    // 2. Check Badges from DB
    const allBadges = await this._getAllBadges();
    const taskBadges = allBadges.filter(
      (b) => b.category === BADGE_CATEGORIES.TASKS,
    );
    const newBadges = [];

    for (const badge of taskBadges) {
      const req = badge.requirements;
      let eligible = true;

      // Check Total Tasks
      if (req.min_tasks_completed !== undefined) {
        if (user.stats.total_tasks_completed < req.min_tasks_completed) {
          eligible = false;
        }
      }

      // Check Category Tasks
      if (req.tasks_by_category) {
        for (const [cat, count] of Object.entries(req.tasks_by_category)) {
          const userCount = user.stats.tasks_by_category.get(cat) || 0;
          if (userCount < count) {
            eligible = false;
            break;
          }
        }
      }

      if (eligible) {
        const awarded = await this._awardBadge(user, badge);
        if (awarded) newBadges.push(awarded);
      }
    }

    await user.save();
    return newBadges;
  }

  /**
   * EVENT: Streak Updated
   */
  async onStreakUpdated(user) {
    const allBadges = await this._getAllBadges();
    const streakBadges = allBadges.filter(
      (b) => b.category === BADGE_CATEGORIES.STREAK,
    );
    const newBadges = [];

    for (const badge of streakBadges) {
      if (badge.requirements?.min_streak !== undefined) {
        if (user.streak >= badge.requirements.min_streak) {
          const awarded = await this._awardBadge(user, badge);
          if (awarded) newBadges.push(awarded);
        }
      }
    }
    return newBadges;
  }

  /**
   * EVENT: Environmental Stats Updated
   */
  async onEnvironmentalStatsUpdated(user) {
    const allBadges = await this._getAllBadges();
    const envBadges = allBadges.filter(
      (b) => b.category === BADGE_CATEGORIES.ENVIRONMENTAL,
    );
    const newBadges = [];

    for (const badge of envBadges) {
      const req = badge.requirements;
      let eligible = true;

      if (
        req.min_co2_saved !== undefined &&
        user.ambient.co2_saved < req.min_co2_saved
      ) {
        eligible = false;
      }
      if (
        req.min_waste_recycled !== undefined &&
        user.ambient.waste_recycled < req.min_waste_recycled
      ) {
        eligible = false;
      }
      if (
        req.min_km_green !== undefined &&
        user.ambient.km_green < req.min_km_green
      ) {
        eligible = false;
      }

      if (eligible) {
        const awarded = await this._awardBadge(user, badge);
        if (awarded) newBadges.push(awarded);
      }
    }
    return newBadges;
  }
}

export default new BadgeService();
