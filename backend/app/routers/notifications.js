import express from "express";
import notification_service from "../services/notification_service.js";
import token_checker from "../middleware/token_checker.js";

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

export default router;
