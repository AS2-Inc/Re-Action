/**
 * Middleware checks if the user has the required role.
 * Also verifies that the user exists in the database and is active.
 * @param {string[]} allowed_roles - Array of allowed roles (e.g., ['admin', 'operator'])
 */

import mongoose from "mongoose";
import Operator from "../models/operator.js";
import User from "../models/user.js";

const check_role = (allowed_roles) => {
  return async (req, res, next) => {
    if (!req.logged_user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRole = req.logged_user.role || "citizen";

    if (!allowed_roles.includes(userRole)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Verify user exists and is active
    try {
      if (mongoose.connection.readyState !== 1) {
        return res
          .status(503)
          .json({ error: "Service Unavailable: Database not connected" });
      }

      let user_exists = false;

      if (userRole === "operator" || userRole === "admin") {
        const operator = await Operator.findById(req.logged_user.id);
        if (operator?.is_active) {
          user_exists = true;
        }
      } else {
        // Citizen
        const user = await User.findById(req.logged_user.id);
        if (user?.is_active) {
          user_exists = true;
        }
      }

      if (!user_exists) {
        return res
          .status(401)
          .json({ error: "Access revoked: User not found or inactive" });
      }
    } catch (error) {
      console.error("Role Checker Check Error:", error);
      return res
        .status(500)
        .json({ error: "Internal Server Error during permission check" });
    }

    next();
  };
};

export default check_role;
