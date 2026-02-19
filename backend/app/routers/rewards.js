import crypto from "node:crypto";
import express from "express";
import check_role from "../middleware/role_checker.js";
import token_checker from "../middleware/token_checker.js";
import Reward from "../models/reward.js";
import User from "../models/user.js";
import UserReward from "../models/user_reward.js";

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

// Admin/Operator Route: Create Reward
router.post(
  "/",
  token_checker,
  check_role(["admin", "operator"]),
  async (req, res) => {
    try {
      const reward = new Reward(req.body);
      await reward.save();
      res.status(201).json(reward);
    } catch (_error) {
      res.status(400).json({ error: "Error creating reward" });
    }
  },
);

/**
 * GET /api/v1/rewards/all
 * List ALL rewards (active and inactive) for operators/admins
 */
router.get(
  "/all",
  token_checker,
  check_role(["admin", "operator"]),
  async (_req, res) => {
    try {
      const rewards = await Reward.find()
        .populate("neighborhoods", "name")
        .sort({ active: -1, created_at: -1 });
      res.status(200).json(rewards);
    } catch (error) {
      console.error("Error fetching all rewards:", error);
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  },
);

/**
 * PUT /api/v1/rewards/:id
 * Update a reward
 */
router.put(
  "/:id",
  token_checker,
  check_role(["admin", "operator"]),
  async (req, res) => {
    try {
      const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).populate("neighborhoods", "name");
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }
      res.status(200).json(reward);
    } catch (error) {
      console.error("Error updating reward:", error);
      res.status(400).json({ error: "Error updating reward" });
    }
  },
);

/**
 * DELETE /api/v1/rewards/:id
 * Delete a reward from the database
 */
router.delete(
  "/:id",
  token_checker,
  check_role(["admin", "operator"]),
  async (req, res) => {
    try {
      const reward = await Reward.findByIdAndDelete(req.params.id);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }
      res.status(200).json({ message: "Reward deleted successfully" });
    } catch (error) {
      console.error("Error deleting reward:", error);
      res.status(500).json({ error: "Failed to delete reward" });
    }
  },
);

export default router;
