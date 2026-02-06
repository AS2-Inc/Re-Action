import Neighborhood from "../models/neighborhood.js";
import User from "../models/user.js";
import Submission from "../models/submission.js";

/**
 * Leaderboard Service (RF17, RF18)
 * Manages leaderboard calculations with normalized scoring
 */
class LeaderboardService {
  /**
   * Get the current leaderboard with normalized scores
   * @param {Object} options - { period: 'weekly'|'monthly'|'all_time', limit: number }
   * @returns {Promise<Array>} Leaderboard entries
   */
  async get_leaderboard(options = {}) {
    const { period = "all_time", limit = 20 } = options;

    const neighborhoods = await Neighborhood.find();

    // Calculate normalized scores for each neighborhood
    const leaderboard_entries = await Promise.all(
      neighborhoods.map(async (n) => {
        const normalized_score = await this.calculate_normalized_score(
          n._id,
          period,
        );
        return {
          neighborhood_id: n._id,
          name: n.name,
          city: n.city,
          raw_score: n.total_score,
          normalized_score: normalized_score.total,
          delta_improvement: normalized_score.delta,
          participation_rate: normalized_score.participation_rate,
          environmental_bonus: normalized_score.environmental_bonus,
        };
      }),
    );

    // Sort by normalized score
    leaderboard_entries.sort((a, b) => b.normalized_score - a.normalized_score);

    // Assign rankings
    let rank = 1;
    for (const entry of leaderboard_entries) {
      entry.rank = rank++;
    }

    // Update neighborhood rankings in database
    await this.update_rankings(leaderboard_entries);

    return leaderboard_entries.slice(0, limit);
  }

  /**
   * Calculate normalized score for a neighborhood (RF18)
   * Takes into account: delta improvement, participation rate, and environmental factors
   *
   * @param {string} neighborhood_id - Neighborhood ID
   * @param {string} period - Time period for calculation
   * @returns {Promise<Object>} Score components
   */
  async calculate_normalized_score(neighborhood_id, period = "all_time") {
    const neighborhood = await Neighborhood.findById(neighborhood_id);
    if (!neighborhood) {
      return {
        total: 0,
        delta: 0,
        participation_rate: 0,
        environmental_bonus: 0,
      };
    }

    // Get date range for period
    const date_range = this.get_date_range(period);

    // 1. Calculate participation rate
    const total_users = await User.countDocuments({
      neighborhood_id,
      is_active: true,
    });

    const active_users = await User.countDocuments({
      neighborhood_id,
      is_active: true,
      last_activity_date: { $gte: date_range.start },
    });

    const participation_rate =
      total_users > 0 ? (active_users / total_users) * 100 : 0;

    // 2. Calculate delta improvement (points gained in period)
    const period_submissions = await Submission.aggregate([
      {
        $match: {
          neighborhood_id: neighborhood._id,
          status: "APPROVED",
          completed_at: { $gte: date_range.start, $lte: date_range.end },
        },
      },
      {
        $group: {
          _id: null,
          total_points: { $sum: "$points_awarded" },
          count: { $sum: 1 },
        },
      },
    ]);

    const delta_points = period_submissions[0]?.total_points || 0;
    const delta_tasks = period_submissions[0]?.count || 0;

    // 3. Calculate environmental bonus (based on neighborhood's environmental data)
    // Neighborhoods with worse initial conditions get a bonus for improvement
    const environmental_bonus = this.calculate_environmental_bonus(
      neighborhood.environmental_data,
    );

    // 4. Calculate normalized score
    // Formula: base_score * participation_multiplier + delta_bonus + environmental_bonus
    const base_score = neighborhood.total_score;
    const participation_multiplier = 1 + (participation_rate / 100) * 0.5; // Up to 50% bonus
    const delta_bonus = delta_points * 0.1; // 10% of period points as bonus

    const total =
      base_score * participation_multiplier + delta_bonus + environmental_bonus;

    return {
      total: Math.round(total),
      delta: delta_points,
      delta_tasks,
      participation_rate: Math.round(participation_rate * 10) / 10,
      environmental_bonus: Math.round(environmental_bonus),
    };
  }

  /**
   * Calculate environmental bonus based on neighborhood conditions
   * Neighborhoods with worse conditions get bonus for improving
   * @param {Object} environmental_data - Neighborhood environmental data
   * @returns {number} Environmental bonus points
   */
  calculate_environmental_bonus(environmental_data) {
    if (!environmental_data) return 0;

    let bonus = 0;

    // Air quality: worse baseline = higher potential bonus
    if (environmental_data.air_quality_index) {
      // AQI above 50 (moderate) gets bonus potential
      const aqi = environmental_data.air_quality_index;
      if (aqi > 50) {
        bonus += Math.min((aqi - 50) * 2, 100); // Up to 100 points
      }
    }

    // Improvement trend bonus
    if (environmental_data.improvement_trend) {
      bonus += environmental_data.improvement_trend * 10;
    }

    return bonus;
  }

  /**
   * Get date range for a period
   * @param {string} period - 'weekly', 'monthly', or 'all_time'
   * @returns {Object} { start: Date, end: Date }
   */
  get_date_range(period) {
    const end = new Date();
    let start = new Date(0); // Beginning of time for 'all_time'

    if (period === "weekly") {
      start = new Date();
      start.setDate(start.getDate() - 7);
    } else if (period === "monthly") {
      start = new Date();
      start.setMonth(start.getMonth() - 1);
    }

    return { start, end };
  }

  /**
   * Update neighborhood rankings based on calculated scores
   * @param {Array} leaderboard_entries - Calculated leaderboard
   */
  async update_rankings(leaderboard_entries) {
    const updates = leaderboard_entries.map((entry) =>
      Neighborhood.findByIdAndUpdate(entry.neighborhood_id, {
        ranking_position: entry.rank,
        normalized_score: entry.normalized_score,
        last_ranking_update: new Date(),
      }),
    );

    await Promise.all(updates);
  }

  /**
   * Recalculate leaderboard after a task completion
   * Called from task_service.award_points
   * @param {string} neighborhood_id - The neighborhood to update
   */
  async on_task_completed(neighborhood_id) {
    // Increment neighborhood score
    await Neighborhood.findByIdAndUpdate(neighborhood_id, {
      $inc: { total_score: 1 },
      last_activity: new Date(),
    });

    // Full recalculation could be expensive, so we just mark for batch update
    // The full recalculation happens on leaderboard fetch or via scheduled job
  }

  /**
   * Award points to a neighborhood
   * @param {string} neighborhood_id - Neighborhood ID
   * @param {number} points - Points to add
   */
  async award_points_to_neighborhood(neighborhood_id, points) {
    await Neighborhood.findByIdAndUpdate(neighborhood_id, {
      $inc: { total_score: points },
      last_activity: new Date(),
    });
  }
}

export default new LeaderboardService();
