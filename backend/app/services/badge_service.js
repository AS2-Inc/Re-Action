import { BADGE_CATEGORIES, DEFAULT_BADGES } from "../config/badges.config.js";
import Badge from "../models/badge.js";

// Service to handle badge logic
// Source of Truth: The Database.
// Config is used ONLY for initial seeding.

class BadgeService {
  constructor() {
    this.badges_cache = null;
    this.init_promise = this.initialize_badges();
  }

  /**
   * Initializes the badges in the database from the config if they don't exist.
   * Also populates the in-memory cache.
   */
  async initialize_badges() {
    try {
      const count = await Badge.countDocuments();
      if (count === 0) {
        console.log("🌱 Seeding badges from config...");
        await Badge.insertMany(DEFAULT_BADGES);
        console.log("✅ Badges seeded.");
      }
      // Load all badges into cache for runtime efficiency
      this.badges_cache = await Badge.find({});
    } catch (error) {
      console.error("❌ Error initializing badges:", error);
      this.badges_cache = []; // Fallback to empty to prevent crashes
    }
  }

  /**
   * Helper: Ensure initialization is complete and return all badges
   */
  async _get_all_badges() {
    if (!this.badges_cache || this.badges_cache.length === 0) {
      await this.initialize_badges();
    }
    return this.badges_cache;
  }

  /**
   * Helper: Add badge to user if they don't have it
   */
  async _award_badge(user, badge) {
    // Check if user already has this specific badge
    const has_badge = user.badges_id.some(
      (b) => b.toString() === badge._id.toString(),
    );

    if (!has_badge) {
      user.badges_id.push(badge._id);
      console.log(`🎖️ Badge "${badge.name}" awarded to user ${user.email}`);
      return badge;
    }
    return null;
  }

  /**
   * EVENT: Points Updated
   */
  async on_points_updated(user) {
    const all_badges = await this._get_all_badges();
    const point_badges = all_badges.filter(
      (b) => b.category === BADGE_CATEGORIES.POINTS,
    );
    const new_badges = [];

    for (const badge of point_badges) {
      if (badge.requirements?.min_points !== undefined) {
        if (user.points >= badge.requirements.min_points) {
          const awarded = await this._award_badge(user, badge);
          if (awarded) new_badges.push(awarded);
        }
      }
    }
    return new_badges;
  }

  /**
   * EVENT: Task Completed
   */
  async on_task_completed(user, task) {
    // 1. Update User Stats
    if (!user.stats) {
      user.stats = { total_tasks_completed: 0, tasks_by_category: new Map() };
    }

    // Increment total
    user.stats.total_tasks_completed =
      (user.stats.total_tasks_completed || 0) + 1;

    // Increment Category
    const category = task.category;
    const current_cat_count = user.stats.tasks_by_category.get(category) || 0;
    user.stats.tasks_by_category.set(category, current_cat_count + 1);

    // 2. Check Badges from DB
    const all_badges = await this._get_all_badges();
    const task_badges = all_badges.filter(
      (b) => b.category === BADGE_CATEGORIES.TASKS,
    );
    const new_badges = [];

    for (const badge of task_badges) {
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
          const user_count = user.stats.tasks_by_category.get(cat) || 0;
          if (user_count < count) {
            eligible = false;
            break;
          }
        }
      }

      if (eligible) {
        const awarded = await this._award_badge(user, badge);
        if (awarded) new_badges.push(awarded);
      }
    }

    await user.save();
    return new_badges;
  }

  /**
   * EVENT: Streak Updated
   */
  async on_streak_updated(user) {
    const all_badges = await this._get_all_badges();
    const streak_badges = all_badges.filter(
      (b) => b.category === BADGE_CATEGORIES.STREAK,
    );
    const new_badges = [];

    for (const badge of streak_badges) {
      if (badge.requirements?.min_streak !== undefined) {
        if (user.streak >= badge.requirements.min_streak) {
          const awarded = await this._award_badge(user, badge);
          if (awarded) new_badges.push(awarded);
        }
      }
    }
    return new_badges;
  }

  /**
   * EVENT: Environmental Stats Updated
   */
  async on_environmental_stats_updated(user) {
    const all_badges = await this._get_all_badges();
    const env_badges = all_badges.filter(
      (b) => b.category === BADGE_CATEGORIES.ENVIRONMENTAL,
    );
    const new_badges = [];

    for (const badge of env_badges) {
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
        const awarded = await this._award_badge(user, badge);
        if (awarded) new_badges.push(awarded);
      }
    }
    return new_badges;
  }
}

export default new BadgeService();
