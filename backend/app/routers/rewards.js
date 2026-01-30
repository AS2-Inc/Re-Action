import express from "express";
import token_checker from "../middleware/token_checker.js";
import Reward from "../models/reward.js";
import UserReward from "../models/user_reward.js";
import User from "../models/user.js";
import crypto from "node:crypto";

const router = express.Router();

/**
 * GET /api/v1/rewards
 * List all active rewards
 */
router.get("/", token_checker, async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const rewards = await Reward.find({
      active: true,
      $or: [
        { expiry_date: { $exists: false } },
        { expiry_date: { $gt: new Date() } },
      ],
    });
    res.status(200).json(rewards);
  } catch (error) {
    console.error("Error fetching rewards:", error);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

/**
 * POST /api/v1/rewards/:id/redeem
 * Redeem a reward
 */
router.post("/:id/redeem", token_checker, async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const reward_id = req.params.id;
  const user_id = req.logged_user.id;

  try {
    const reward = await Reward.findById(reward_id);
    if (!reward) {
      return res.status(404).json({ error: "Reward not found" });
    }

    if (!reward.active) {
      return res.status(400).json({ error: "Reward is no longer active" });
    }

    if (reward.quantity_available <= 0) {
      return res.status(400).json({ error: "Reward is out of stock" });
    }

    if (reward.expiry_date && new Date(reward.expiry_date) < new Date()) {
      return res.status(400).json({ error: "Reward has expired" });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.points < reward.points_cost) {
      return res.status(400).json({ error: "Insufficient points" });
    }

    // Transaction-like operations
    user.points -= reward.points_cost;
    await user.save();

    reward.quantity_available -= 1;
    await reward.save();

    const unique_code = crypto.randomBytes(8).toString("hex").toUpperCase();

    const user_reward = new UserReward({
      user_id: user._id,
      reward_id: reward._id,
      unique_code: unique_code,
    });
    await user_reward.save();

    res.status(200).json({
      message: "Reward redeemed successfully",
      reward_title: reward.title,
      points_remaining: user.points,
      code: unique_code,
    });
  } catch (error) {
    console.error("Error redeeming reward:", error);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
});

/**
 * GET /api/v1/rewards/my-rewards
 * List rewards redeemed by the logged-in user
 */
router.get("/my-rewards", token_checker, async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const my_rewards = await UserReward.find({ user_id: req.logged_user.id })
      .populate("reward_id")
      .sort({ redeemed_at: -1 });

    res.status(200).json(my_rewards);
  } catch (error) {
    console.error("Error fetching my rewards:", error);
    res.status(500).json({ error: "Failed to fetch my rewards" });
  }
});

// Admin Route: Create Reward
router.post("/", token_checker, async (req, res) => {
  if (req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized: Admins only" });
  }

  try {
    const reward = new Reward(req.body);
    await reward.save();
    res.status(201).json(reward);
  } catch (_error) {
    res.status(400).json({ error: "Error creating reward" });
  }
});

export default router;
