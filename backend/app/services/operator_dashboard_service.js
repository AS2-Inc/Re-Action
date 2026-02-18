import mongoose from "mongoose";
import ServiceError from "../errors/service_error.js";
import Neighborhood from "../models/neighborhood.js";
import Submission from "../models/submission.js";
import Task from "../models/task.js";
import User from "../models/user.js";

/**
 * Operator Dashboard Service
 * Provides aggregated data for RF10: Interfaccia lato comune
 */
class OperatorDashboardService {
  /**
   * Get complete dashboard overview for operators
   * @returns {Promise<Object>} Dashboard data with overall stats
   */
  async get_dashboard_overview() {
    const today_start = new Date();
    today_start.setHours(0, 0, 0, 0);

    const week_ago = new Date();
    week_ago.setDate(week_ago.getDate() - 7);

    // Overall stats
    const [
      total_users,
      active_users_today,
      active_users_week,
      total_tasks,
      active_tasks,
      pending_submissions,
      approved_today,
    ] = await Promise.all([
      User.countDocuments({ is_active: true }),
      User.countDocuments({
        last_activity_date: { $gte: today_start },
      }),
      User.countDocuments({
        last_activity_date: { $gte: week_ago },
      }),
      Task.countDocuments(),
      Task.countDocuments({ is_active: true }),
      Submission.countDocuments({ status: "PENDING" }),
      Submission.countDocuments({
        status: "APPROVED",
        completed_at: { $gte: today_start },
      }),
    ]);

    // Get neighborhoods with stats
    const neighborhoods = await this.get_neighborhoods_summary();

    // Get recent activity
    const recent_submissions = await Submission.find({ status: "PENDING" })
      .populate("user_id", "name surname email")
      .populate("task_id", "title category")
      .sort({ submitted_at: -1 })
      .limit(10);

    return {
      stats: {
        total_users,
        active_users_today,
        active_users_week,
        total_tasks,
        active_tasks,
        pending_submissions,
        approved_today,
      },
      neighborhoods,
      recent_pending_submissions: recent_submissions.map((s) => ({
        id: s._id,
        user: s.user_id ? `${s.user_id.name} ${s.user_id.surname}` : "Unknown",
        task: s.task_id?.title || "Unknown",
        category: s.task_id?.category,
        photo_url: s.proof?.photo_url,
        submitted_at: s.submitted_at,
      })),
    };
  }

  /**
   * Get summary stats for all neighborhoods
   * @returns {Promise<Array>} Neighborhood summaries
   */
  async get_neighborhoods_summary() {
    const neighborhoods = await Neighborhood.find().sort({
      ranking_position: 1,
    });

    const summaries = await Promise.all(
      neighborhoods.map(async (n) => {
        const user_count = await User.countDocuments({
          neighborhood_id: n._id,
          is_active: true,
        });

        const week_ago = new Date();
        week_ago.setDate(week_ago.getDate() - 7);

        const submissions_this_week = await Submission.countDocuments({
          neighborhood_id: n._id,
          status: "APPROVED",
          completed_at: { $gte: week_ago },
        });

        const completed_tasks = await Submission.countDocuments({
          neighborhood_id: n._id,
          status: "APPROVED",
        });

        return {
          id: n._id,
          name: n.name,
          city: n.city,
          total_score: n.total_score,
          ranking_position: n.ranking_position,
          user_count,
          submissions_this_week,
          completed_tasks,
          environmental_data: n.environmental_data,
          active_goals: n.active_goals,
          normalized_score: n.normalized_score,
        };
      }),
    );

    return summaries;
  }

  /**
   * Get detailed stats for a specific neighborhood
   * @param {string} neighborhood_id - Neighborhood MongoDB ID
   * @returns {Promise<Object>} Detailed neighborhood data
   */
  async get_neighborhood_detail(neighborhood_id) {
    const neighborhood = await Neighborhood.findById(neighborhood_id);
    if (!neighborhood) {
      throw new ServiceError("Neighborhood not found", 404);
    }

    // Cast to ObjectId for use in aggregation pipelines (Mongoose doesn't auto-cast in $match)
    const neighborhood_oid = new mongoose.Types.ObjectId(neighborhood_id);

    // User stats
    const users = await User.find({
      neighborhood_id,
      is_active: true,
    }).sort({ points: -1 });

    // Submissions stats
    const month_ago = new Date();
    month_ago.setMonth(month_ago.getMonth() - 1);

    const submissions_by_category = await Submission.aggregate([
      {
        $match: {
          neighborhood_id: neighborhood_oid,
          status: "APPROVED",
          completed_at: { $gte: month_ago },
        },
      },
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

    // Daily activity for last 30 days
    const daily_activity = await Submission.aggregate([
      {
        $match: {
          neighborhood_id: neighborhood_oid,
          status: "APPROVED",
          completed_at: { $gte: month_ago },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$completed_at" },
          },
          count: { $sum: 1 },
          points: { $sum: "$points_awarded" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      neighborhood: {
        id: neighborhood._id,
        name: neighborhood.name,
        city: neighborhood.city,
        total_score: neighborhood.total_score,
        ranking_position: neighborhood.ranking_position,
        environmental_data: neighborhood.environmental_data,
        active_goals: neighborhood.active_goals,
        normalized_score: neighborhood.normalized_score,
      },
      stats: {
        total_users: users.length,
        participation_rate:
          users.length > 0
            ? (users.filter((u) => u.stats?.total_tasks_completed > 0).length /
                users.length) *
              100
            : 0,
        submissions_by_category: Object.fromEntries(
          submissions_by_category.map((c) => [c._id, c.count]),
        ),
      },
      daily_activity,
      top_users: users.slice(0, 10).map((u) => ({
        id: u._id,
        name: `${u.name} ${u.surname}`,
        points: u.points,
        level: u.level,
        tasks_completed: u.stats?.total_tasks_completed || 0,
      })),
    };
  }

  /**
   * Get environmental indicators across all neighborhoods
   * @returns {Promise<Object>} Aggregated environmental data
   */
  async get_environmental_indicators() {
    const neighborhoods = await Neighborhood.find();

    // Aggregate ambient stats from users
    const ambient_aggregate = await User.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: null,
          total_co2_saved: { $sum: "$ambient.co2_saved" },
          total_waste_recycled: { $sum: "$ambient.waste_recycled" },
          total_km_green: { $sum: "$ambient.km_green" },
        },
      },
    ]);

    const totals = ambient_aggregate[0] || {
      total_co2_saved: 0,
      total_waste_recycled: 0,
      total_km_green: 0,
    };

    return {
      overall: {
        co2_saved_kg: totals.total_co2_saved,
        waste_recycled_kg: totals.total_waste_recycled,
        green_km_traveled: totals.total_km_green,
      },
      by_neighborhood: neighborhoods.map((n) => ({
        id: n._id,
        name: n.name,
        environmental_data: n.environmental_data || {},
      })),
    };
  }

  /**
   * Generate stats report for a given period
   * @param {Date} start_date - Start of period
   * @param {Date} end_date - End of period
   * @returns {Promise<Object>} Report data
   */
  async generate_stats_report(start_date, end_date) {
    const submissions = await Submission.aggregate([
      {
        $match: {
          status: "APPROVED",
          completed_at: { $gte: start_date, $lte: end_date },
        },
      },
      {
        $lookup: {
          from: "tasks",
          localField: "task_id",
          foreignField: "_id",
          as: "task",
        },
      },
      { $unwind: "$task" },
      {
        $group: {
          _id: {
            neighborhood_id: "$neighborhood_id",
            category: "$task.category",
          },
          count: { $sum: 1 },
          total_points: { $sum: "$points_awarded" },
        },
      },
    ]);

    // Get neighborhood names
    const neighborhoods = await Neighborhood.find();
    const neighborhood_map = Object.fromEntries(
      neighborhoods.map((n) => [n._id.toString(), n.name]),
    );

    // Format report
    const report_data = {};
    for (const row of submissions) {
      const n_id = row._id.neighborhood_id?.toString() || "unknown";
      const n_name = neighborhood_map[n_id] || "Unknown";

      if (!report_data[n_name]) {
        report_data[n_name] = {
          total_tasks: 0,
          total_points: 0,
          categories: {},
        };
      }

      report_data[n_name].total_tasks += row.count;
      report_data[n_name].total_points += row.total_points;
      report_data[n_name].categories[row._id.category] = row.count;
    }

    return {
      period: {
        start: start_date,
        end: end_date,
      },
      data: report_data,
    };
  }
}

export default new OperatorDashboardService();
