import express from "express";
import notification_service from "../services/notification_service.js";
import token_checker from "../middleware/token_checker.js";
import User from "../models/user.js";

const router = express.Router();

// Middleware to check authentication for all routes
router.use(token_checker);

// Get user notifications
router.get("/", async (req, res) => {
  try {
    const notifications = await notification_service.get_user_notifications(
      req.logged_user.id,
    );
    res.status(200).json(notifications);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark a single notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await notification_service.mark_as_read(
      req.params.id,
      req.logged_user.id,
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json(notification);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Mark all as read
router.patch("/read-all", async (req, res) => {
  try {
    await notification_service.mark_all_as_read(req.logged_user.id);
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (_error) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

/**
 * PATCH /api/v1/notifications/preferences
 * Update user's notification preferences (RF5)
 */
router.patch("/preferences", async (req, res) => {
  try {
    const {
      daily,
      email,
      push,
      motivational,
      informational,
      positive_reinforcement,
    } = req.body;

    const user = await User.findById(req.logged_user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update only the fields that are provided
    if (daily !== undefined) user.notification_preferences.daily = daily;
    if (email !== undefined) user.notification_preferences.email = email;
    if (push !== undefined) user.notification_preferences.push = push;
    if (motivational !== undefined)
      user.notification_preferences.motivational = motivational;
    if (informational !== undefined)
      user.notification_preferences.informational = informational;
    if (positive_reinforcement !== undefined) {
      user.notification_preferences.positive_reinforcement =
        positive_reinforcement;
    }

    await user.save();

    res.status(200).json({
      message: "Notification preferences updated",
      preferences: user.notification_preferences,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

/**
 * GET /api/v1/notifications/preferences
 * Get user's current notification preferences
 */
router.get("/preferences", async (req, res) => {
  try {
    const user = await User.findById(req.logged_user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user.notification_preferences);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

export default router;
