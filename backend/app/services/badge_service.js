import ServiceError from "../errors/service_error.js";
import Badge from "../models/badge.js";
import Activity from "../models/submission.js";
import User from "../models/user.js";

/**
 * Badge Service - Manages automatic badge awarding based on user achievements
 *
 * This service handles:
 * - Initializing default badges in the database
 * - Checking user eligibility for badges
 * - Awarding new badges to users
 * - Updating user levels based on points
 * - Retrieving badge information with earned status
 */
class BadgeService {
  // Level thresholds defining user levels based on points
  LEVEL_THRESHOLDS = [
    {
      level: "Cittadino Base",
      points: 0,
    },
    {
      level: "Cittadino Attivo",
      points: 100,
    },
    {
      level: "Cittadino Consapevole",
      points: 300,
    },
    {
      level: "Ambasciatore Sostenibile",
      points: 750,
    },
    {
      level: "Guerriero Verde",
      points: 1500,
    },
    {
      level: "Maestro della Sostenibilità",
      points: 3000,
    },
  ];
  /**
   * Build user context for badge checking
   * Aggregates all relevant user statistics and activities
   *
   * @param {Object} user - User document
   * @param {Array} completedActivities - Array of approved activities
   * @returns {Object} Context object with user stats
   * @private
   */
  _buildUserContext(user, completedActivities) {
    const tasksByCategory = {
      Mobility: 0,
      Waste: 0,
      Community: 0,
      Volunteering: 0,
    };

    completedActivities.forEach((activity) => {
      if (activity.task_id?.category) {
        tasksByCategory[activity.task_id.category] =
          (tasksByCategory[activity.task_id.category] || 0) + 1;
      }
    });

    return {
      user,
      tasksByCategory,
      totalTasksCompleted: completedActivities.length,
    };
  }

  /**
   * Get user's existing badge IDs as strings
   *
   * @param {Array} badges_id - Array of badge references (ObjectIds or objects)
   * @returns {Array<string>} Array of badge ID strings
   * @private
   */
  _getUserBadgeIds(badges_id) {
    return badges_id.map((badge) =>
      typeof badge === "object" ? badge._id.toString() : badge.toString(),
    );
  }

  /**
   * Update user's level based on points
   * Uses thresholds defined in the service's LEVEL_THRESHOLDS
   *
   * @param {Object} user - User document to update
   * @private
   */
  _updateUserLevel(user) {
    for (const { points, level } of this.LEVEL_THRESHOLDS) {
      if (user.points >= points) {
        user.level = level;
        break;
      }
    }
  }

  /**
   * Check if a user meets the requirements for a badge
   *
   * @param {Object} badge - Badge document
   * @param {Object} context - User context object
   * @returns {boolean} True if requirements are met
   * @private
   */
  _checkBadgeRequirements(badge, context) {
    const { user, tasksByCategory, totalTasksCompleted } = context;
    const reqs = badge.requirements;

    if (!reqs) return false;

    // Check points requirements
    if (reqs.min_points && user.points < reqs.min_points) {
      return false;
    }

    // Check task completion count
    if (
      reqs.min_tasks_completed &&
      totalTasksCompleted < reqs.min_tasks_completed
    ) {
      return false;
    }

    // Check task category requirements
    if (reqs.tasks_by_category) {
      for (const [category, count] of Object.entries(reqs.tasks_by_category)) {
        if ((tasksByCategory[category] || 0) < count) {
          return false;
        }
      }
    }

    // Check streak requirements
    if (reqs.min_streak && (user.streak || 0) < reqs.min_streak) {
      return false;
    }

    // Check environmental impact requirements
    if (
      reqs.min_co2_saved &&
      (user.ambient?.co2_saved || 0) < reqs.min_co2_saved
    ) {
      return false;
    }

    if (
      reqs.min_waste_recycled &&
      (user.ambient?.waste_recycled || 0) < reqs.min_waste_recycled
    ) {
      return false;
    }

    if (
      reqs.min_km_green &&
      (user.ambient?.km_green || 0) < reqs.min_km_green
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check and award badges to a user based on their current statistics
   *
   * This method:
   * 1. Fetches user data and completed activities
   * 2. Builds context with user statistics
   * 3. Checks each badge against requirements using strategy pattern
   * 4. Awards new badges and updates user level
   *
   * @param {string} userId - The user's MongoDB ID
   * @returns {Promise<Array>} Array of newly awarded badges
   * @throws {Error} If user not found or database error occurs
   */
  async checkAndAwardBadges(userId) {
    try {
      const user = await User.findById(userId).populate("badges_id");
      if (!user) {
        throw new ServiceError("User not found", 404);
      }

      // Fetch all badges and user's completed activities
      const [allBadges, completedActivities] = await Promise.all([
        Badge.find({}),
        Activity.find({
          user_id: userId,
          status: "APPROVED",
        }).populate("task_id"),
      ]);

      // Build context for badge checking
      const userContext = this._buildUserContext(user, completedActivities);
      const userBadgeIds = this._getUserBadgeIds(user.badges_id);

      // Check each badge and award if qualified
      const newlyAwardedBadges = [];

      for (const badge of allBadges) {
        // Skip if user already has this badge
        if (userBadgeIds.includes(badge._id.toString())) {
          continue;
        }

        // Check if user qualifies for this badge
        if (this._checkBadgeRequirements(badge, userContext)) {
          user.badges_id.push(badge._id);
          newlyAwardedBadges.push(badge);
          console.log(`🎖️ Badge "${badge.name}" awarded to user ${user.email}`);
        }
      }

      // Update user level based on points
      const previousLevel = user.level;
      this._updateUserLevel(user);

      // Save user if new badges were awarded or level changed
      if (newlyAwardedBadges.length > 0 || user.level !== previousLevel) {
        await user.save();
      }

      return newlyAwardedBadges;
    } catch (error) {
      console.error("Error checking badges:", error);
      throw error;
    }
  }

  /**
   * Get all badges with user's earned status
   *
   * Retrieves all available badges from the database and marks
   * which ones the user has already earned
   *
   * @param {string} userId - The user's MongoDB ID
   * @returns {Promise<Array>} Array of all badges with earned flag
   * @throws {Error} If user not found or database error occurs
   */
  async getAllBadgesWithStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new ServiceError("User not found", 404);
      }

      const allBadges = await Badge.find({}).sort({ display_order: 1 });
      const userBadgeIds = user.badges_id.map((id) => id.toString());

      return allBadges.map((badge) => ({
        ...badge.toObject(),
        earned: userBadgeIds.includes(badge._id.toString()),
      }));
    } catch (error) {
      console.error("Error getting badges:", error);
      throw error;
    }
  }

  /**
   * Get user's earned badges
   *
   * @param {string} userId - The user's MongoDB ID
   * @returns {Promise<Array>} Array of earned badge documents
   * @throws {Error} If user not found
   */
  async getUserBadges(userId) {
    try {
      const user = await User.findById(userId).populate("badges_id");
      if (!user) {
        throw new ServiceError("User not found", 404);
      }

      return user.badges_id;
    } catch (error) {
      console.error("Error getting user badges:", error);
      throw error;
    }
  }
  /**
   * Check if user leveled up after earning badges
   *
   * @param {Object} user - User document
   * @returns {boolean} True if user leveled up
   */
  check_level_up(user) {
    const currentLevel = user.level;
    const nextLevel = currentLevel + 1;
    const nextLevelThreshold =
      this.LEVEL_THRESHOLDS.find((t) => t.level === nextLevel)?.points ||
      Infinity;

    return user.points >= nextLevelThreshold;
  }

  /**
   * Get level thresholds
   *
   * Returns the list of level thresholds with point requirements.
   * This provides the point ranges that define each user level.
   *
   * @returns {Array<Object>} Array of level threshold objects with level name and points
   */
  getLevelThresholds() {
    return this.LEVEL_THRESHOLDS;
  }
}

export default new BadgeService();
