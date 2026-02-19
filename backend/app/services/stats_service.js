import ServiceError from "../errors/service_error.js";
import Neighborhood from "../models/neighborhood.js";
import User from "../models/user.js";

/**
 * Get public aggregated statistics for landing page
 * @returns {Promise<Object>} Public stats including users, neighborhoods, and CO2 saved
 */
export const get_public_stats = async () => {
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

    return {
      total_users,
      total_neighborhoods,
      total_co2_saved: totals.total_co2_saved,
    };
  } catch (error) {
    throw new ServiceError(500, "Failed to fetch public stats");
  }
};
