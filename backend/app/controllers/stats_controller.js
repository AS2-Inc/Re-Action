import ServiceError from "../errors/service_error.js";
import * as StatsService from "../services/stats_service.js";

/**
 * GET /api/v1/stats/public
 * Get public aggregated statistics for landing page
 */
export const get_public_stats = async (_req, res) => {
  try {
    const stats = await StatsService.get_public_stats();
    res.status(200).json(stats);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Public stats error:", error);
    res.status(500).json({ error: "Failed to fetch public stats" });
  }
};
