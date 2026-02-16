import Badge from "../models/badge.js";
import { LEVEL_THRESHOLDS } from "../config/badges.config.js";
import Neighborhood from "../models/neighborhood.js";
import Submission from "../models/submission.js";
import User from "../models/user.js";
import UserReward from "../models/user_reward.js";
import UserTask from "../models/user_task.js";

/**
 * User Dashboard Service
 * Aggregates all dashboard-related data for RF3: Visualizzazione dashboard utente
 */
class UserDashboardService {
  /**
   * Get complete dashboard data for a user
   * Includes: points, streak, badges, ambient stats, neighborhood info, active goals
   *
   * @param {string} user_id - User MongoDB ID
   * @returns {Promise<Object>} Complete dashboard data
   */
  async get_dashboard_data(user_id) {
    const user = await User.findById(user_id).populate("neighborhood_id");
    if (!user) {
      throw new Error("User not found");
    }

    // Get recent completed submissions count
    const tasks_completed = await Submission.countDocuments({
      user_id: user_id,
      status: "APPROVED",
    });

    // Get user badges
    const user_badges = await Badge.find({
      _id: { $in: user.badges_id },
    }).sort({ display_order: 1 });

    // Get recent badges (last 5)
    const recent_badges = user_badges.slice(-5).reverse();

    // Get recent rewards
    const recent_rewards = await UserReward.find({ user_id })
      .populate("reward_id")
      .sort({ redeemed_at: -1 })
      .limit(5);

    // Get active tasks
    const active_tasks = await UserTask.find({
      user_id,
      status: "ASSIGNED",
      expires_at: { $gt: new Date() },
    }).populate("task_id");

    // Get neighborhood data
    let neighborhood_data = null;
    if (user.neighborhood_id) {
      const neighborhood = await Neighborhood.findById(user.neighborhood_id);
      if (neighborhood) {
        neighborhood_data = {
          id: neighborhood._id,
          name: neighborhood.name,
          total_score: neighborhood.total_score,
          ranking_position: neighborhood.ranking_position,
          active_goals: neighborhood.active_goals.filter(
            (g) => !g.is_completed,
          ),
        };
      }
    }

    return {
      user: {
        name: user.name,
        surname: user.surname,
        email: user.email,
        points: user.points,
        level: user.level,
        streak: user.streak,
        last_activity_date: user.last_activity_date,
      },
      level_thresholds: LEVEL_THRESHOLDS,
      stats: {
        tasks_completed,
        badges_count: user_badges.length,
      },
      ambient: {
        co2_saved: user.ambient?.co2_saved || 0,
        waste_recycled: user.ambient?.waste_recycled || 0,
        km_green: user.ambient?.km_green || 0,
      },
      recent_badges: recent_badges.map((b) => ({
        id: b._id,
        name: b.name,
        icon: b.icon,
        description: b.description,
      })),
      recent_rewards: recent_rewards.map((r) => ({
        id: r._id,
        title: r.reward_id?.title,
        redeemed_at: r.redeemed_at,
        code: r.unique_code,
      })),
      active_tasks: active_tasks.map((ut) => ({
        assignment_id: ut._id,
        task_id: ut.task_id?._id,
        title: ut.task_id?.title,
        category: ut.task_id?.category,
        base_points: ut.task_id?.base_points,
        expires_at: ut.expires_at,
      })),
      neighborhood: neighborhood_data,
    };
  }

  /**
   * Get user action history with pagination
   * Includes: completed tasks, earned badges, redeemed rewards
   *
   * @param {string} user_id - User MongoDB ID
   * @param {Object} options - Pagination options { page, limit, type }
   * @returns {Promise<Object>} Paginated history data
   */
  async get_history(user_id, options = {}) {
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 20;
    const type = options.type || "all";
    const skip = (page - 1) * limit;

    const user = await User.findById(user_id);
    if (!user) {
      throw new Error("User not found");
    }

    const history = [];

    // Get task submissions
    if (type === "all" || type === "tasks") {
      const submissions = await Submission.find({
        user_id,
        status: "APPROVED",
      })
        .populate("task_id")
        .sort({ completed_at: -1 });

      for (const sub of submissions) {
        history.push({
          type: "task_completed",
          timestamp: sub.completed_at || sub.submitted_at,
          data: {
            task_id: sub.task_id?._id,
            title: sub.task_id?.title,
            category: sub.task_id?.category,
            points_awarded: sub.points_awarded || sub.task_id?.base_points,
          },
        });
      }
    }

    // Get redeemed rewards
    if (type === "all" || type === "rewards") {
      const rewards = await UserReward.find({ user_id })
        .populate("reward_id")
        .sort({ redeemed_at: -1 });

      for (const reward of rewards) {
        history.push({
          type: "reward_redeemed",
          timestamp: reward.redeemed_at,
          data: {
            reward_id: reward.reward_id?._id,
            title: reward.reward_id?.title,
            points_cost: reward.reward_id?.points_cost,
          },
        });
      }
    }

    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const total = history.length;
    const paginated = history.slice(skip, skip + limit);

    return {
      items: paginated,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get aggregated statistics for a user
   *
   * @param {string} user_id - User MongoDB ID
   * @returns {Promise<Object>} Aggregated stats
   */
  async get_stats(user_id) {
    const user = await User.findById(user_id);
    if (!user) {
      throw new Error("User not found");
    }

    // Get tasks by category
    const tasks_by_category = await Submission.aggregate([
      { $match: { user_id: user._id, status: "APPROVED" } },
      {
        $lookup: {
          from: "tasks",
          localField: "task_id",
          foreignField: "_id",
          as: "task",
        },
      },
      { $unwind: "$task" },
      { $group: { _id: "$task.category", count: { $sum: 1 } } },
    ]);

    // Get submissions by month (last 12 months)
    const twelve_months_ago = new Date();
    twelve_months_ago.setMonth(twelve_months_ago.getMonth() - 12);

    const submissions_by_month = await Submission.aggregate([
      {
        $match: {
          user_id: user._id,
          status: "APPROVED",
          completed_at: { $gte: twelve_months_ago },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$completed_at" },
            month: { $month: "$completed_at" },
          },
          count: { $sum: 1 },
          points: { $sum: "$points_awarded" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return {
      total_tasks: user.stats?.total_tasks_completed || 0,
      tasks_by_category: Object.fromEntries(
        tasks_by_category.map((t) => [t._id, t.count]),
      ),
      submissions_by_month,
      ambient: user.ambient,
      streak: {
        current: user.streak,
        last_activity: user.last_activity_date,
      },
    };
  }
}

export default new UserDashboardService();
