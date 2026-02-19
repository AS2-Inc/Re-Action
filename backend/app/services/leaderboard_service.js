import mongoose from "mongoose";
import Neighborhood from "../models/neighborhood.js";
import Submission from "../models/submission.js";
import User from "../models/user.js";

/**
 * Leaderboard Service (RF17, RF18)
 *
 * Everything is computed on-demand when the leaderboard is fetched.
 *
 * Neighborhood ranking is based on:
 *  - base_points: sum of points_awarded from all APPROVED submissions by users in the neighborhood
 *  - normalized_points: base_points / total_users  (so smaller neighborhoods can compete)
 *  - participation_rate: active_users / total_users per period (weekly, monthly, annually)
 *  - improvement_factor: % change in points earned vs the previous period
 *
 * Environmental totals (co2_saved, km_green, waste_recycled) are updated incrementally
 * on task completion via on_task_completed().
 */
class LeaderboardService {
  // ──────────────────────────── Public API ────────────────────────────

  /**
   * Get the current leaderboard.
   * Period stats (participation, improvement) are computed live.
   *
   * @param {Object} options - { period: 'weekly'|'monthly'|'annually'|'all_time', limit: number }
   * @returns {Promise<Array>} Sorted leaderboard entries
   */
  async get_leaderboard(options = {}) {
    const { period = "all_time", limit = 20 } = options;

    const neighborhoods = await Neighborhood.find();

    // Compute every entry on-demand (including period stats)
    const leaderboard_entries = await Promise.all(
      neighborhoods.map((n) => this._build_entry(n, period)),
    );

    // Sort by normalized_points descending
    leaderboard_entries.sort(
      (a, b) => b.normalized_points - a.normalized_points,
    );

    // Assign rankings
    leaderboard_entries.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    // Persist rankings to DB
    await this._persist_rankings(leaderboard_entries);

    return leaderboard_entries.slice(0, limit);
  }

  /**
   * Lightweight update after a single task completion.
   * Increments base_points and environmental data.
   *
   * @param {string} neighborhood_id
   * @param {number} points - points to add
   * @param {Object} [impact] - { co2_saved, waste_recycled, km_green }
   */
  async on_task_completed(neighborhood_id, points = 0, impact = {}) {
    const inc = { base_points: points };
    if (impact.co2_saved)
      inc["environmental_data.co2_saved"] = impact.co2_saved;
    if (impact.waste_recycled)
      inc["environmental_data.waste_recycled"] = impact.waste_recycled;
    if (impact.km_green) inc["environmental_data.km_green"] = impact.km_green;

    const neighborhood = await Neighborhood.findByIdAndUpdate(
      neighborhood_id,
      {
        $inc: inc,
        $set: { "environmental_data.last_updated": new Date() },
      },
      { new: true },
    );

    if (neighborhood) {
      // Recalculate normalized_points with updated base_points
      const total_users = await User.countDocuments({
        neighborhood_id,
        is_active: true,
      });
      const normalized_points =
        total_users > 0
          ? Math.round((neighborhood.base_points / total_users) * 100) / 100
          : 0;

      await Neighborhood.findByIdAndUpdate(neighborhood_id, {
        $set: { normalized_points },
      });
    }
  }

  // ──────────────────────────── Internal helpers ────────────────────────────

  /**
   * Build a single leaderboard entry, computing period stats on-the-fly.
   */
  async _build_entry(neighborhood, period) {
    const period_stats = await this._compute_period_stats(
      neighborhood._id,
      period,
    );

    return {
      neighborhood_id: neighborhood._id,
      name: neighborhood.name,
      city: neighborhood.city,
      base_points: neighborhood.base_points,
      normalized_points: neighborhood.normalized_points,
      participation_rate: period_stats.participation_rate,
      improvement_factor: period_stats.improvement_factor,
      active_users: period_stats.active_users,
      total_users: period_stats.total_users,
      points_earned_in_period: period_stats.points_earned,
      environmental_data: {
        co2_saved: neighborhood.environmental_data?.co2_saved || 0,
        waste_recycled: neighborhood.environmental_data?.waste_recycled || 0,
        km_green: neighborhood.environmental_data?.km_green || 0,
      },
    };
  }

  /**
   * Compute participation_rate, improvement_factor and points_earned
   * for a given period, on-demand.
   *
   * @param {ObjectId} neighborhood_id
   * @param {string} period - 'weekly' | 'monthly' | 'annually' | 'all_time'
   * @returns {Promise<Object>} Period stats
   */
  async _compute_period_stats(neighborhood_id, period) {
    const empty = {
      participation_rate: 0,
      improvement_factor: 0,
      active_users: 0,
      total_users: 0,
      points_earned: 0,
    };

    // For all_time, participation/improvement don't apply
    if (period === "all_time") {
      const neighborhood = await Neighborhood.findById(neighborhood_id);
      return { ...empty, points_earned: neighborhood?.base_points || 0 };
    }

    const { start: current_start, end: current_end } =
      this._get_date_range(period);
    const { start: prev_start, end: prev_end } =
      this._get_previous_date_range(period);

    // User counts
    const [total_users, active_users] = await Promise.all([
      User.countDocuments({
        neighborhood_id,
        is_active: true,
      }),
      User.countDocuments({
        neighborhood_id,
        is_active: true,
        last_activity_date: { $gte: current_start },
      }),
    ]);

    const participation_rate =
      total_users > 0
        ? Math.round((active_users / total_users) * 1000) / 10 // one decimal %
        : 0;

    // Points in current & previous period
    const [current_points, previous_points] = await Promise.all([
      this._sum_points_in_range(neighborhood_id, current_start, current_end),
      this._sum_points_in_range(neighborhood_id, prev_start, prev_end),
    ]);

    let improvement_factor = 0;
    if (previous_points > 0) {
      improvement_factor =
        Math.round(
          ((current_points - previous_points) / previous_points) * 1000,
        ) / 10;
    } else if (current_points > 0) {
      improvement_factor = 100; // new activity where there was none
    }

    return {
      participation_rate,
      improvement_factor,
      active_users,
      total_users,
      points_earned: current_points,
    };
  }

  /**
   * Sum points_awarded for a neighborhood within a date range.
   */
  async _sum_points_in_range(neighborhood_id, start, end) {
    const result = await Submission.aggregate([
      {
        $match: {
          neighborhood_id: mongoose.Types.ObjectId.createFromHexString
            ? typeof neighborhood_id === "string"
              ? new mongoose.Types.ObjectId(neighborhood_id)
              : neighborhood_id
            : neighborhood_id,
          status: "APPROVED",
          completed_at: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$points_awarded" },
        },
      },
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Get the current date range for a period.
   * @param {string} period - 'weekly' | 'monthly' | 'annually'
   * @returns {{ start: Date, end: Date }}
   */
  _get_date_range(period) {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case "weekly":
        start.setDate(start.getDate() - 7);
        break;
      case "monthly":
        start.setMonth(start.getMonth() - 1);
        break;
      case "annually":
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        return { start: new Date(0), end };
    }

    return { start, end };
  }

  /**
   * Get the previous period's date range (the period just before the current one).
   * e.g. for "weekly" current = [now-7d, now], previous = [now-14d, now-7d]
   */
  _get_previous_date_range(period) {
    const current = this._get_date_range(period);
    const duration_ms = current.end.getTime() - current.start.getTime();

    return {
      start: new Date(current.start.getTime() - duration_ms),
      end: new Date(current.start.getTime()),
    };
  }

  /**
   * Persist ranking_position and normalized_points to each neighborhood document.
   */
  async _persist_rankings(leaderboard_entries) {
    const updates = leaderboard_entries.map((entry) =>
      Neighborhood.findByIdAndUpdate(entry.neighborhood_id, {
        $set: {
          ranking_position: entry.rank,
          normalized_points: entry.normalized_points,
          last_ranking_update: new Date(),
        },
      }),
    );
    await Promise.all(updates);
  }
}

export default new LeaderboardService();
