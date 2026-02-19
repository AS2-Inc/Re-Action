import express from "express";
import Neighborhood from "../models/neighborhood.js";
import User from "../models/user.js";

const router = express.Router();

/**
 * GET /api/v1/stats/public
 * Public aggregated stats for landing page
 * TODO: FIX ME
 */
router.get("/public", async (_req, res) => {
  try {
    const [total_users, total_neighborhoods, ambient_aggregate] =
      await Promise.all([
        User.countDocuments({ is_active: true }),
        Neighborhood.countDocuments(),
        User.aggregate([
          { $match: { is_active: true } },
          {
            $group: {
              _id: null,
              total_co2_saved: { $sum: "$ambient.co2_saved" },
            },
          },
        ]),
      ]);

    const totals = ambient_aggregate[0] || { total_co2_saved: 0 };

    res.status(200).json({
      total_users,
      total_neighborhoods,
      total_co2_saved: totals.total_co2_saved,
    });
  } catch (error) {
    console.error("Public stats error:", error);
    res.status(500).json({ error: "Failed to fetch public stats" });
  }
});

export default router;
