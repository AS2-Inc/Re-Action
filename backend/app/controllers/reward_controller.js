import ServiceError from "../errors/service_error.js";
import * as RewardService from "../services/reward_service.js";

/**
 * GET /api/v1/rewards
 * Get active rewards for the user's neighborhood
 */
export const get_active_rewards = async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const rewards = await RewardService.get_active_rewards(req.logged_user.id);
    res.status(200).json(rewards);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching rewards:", error);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
};

/**
 * GET /api/v1/rewards/my-rewards
 * Get rewards redeemed by the logged-in user
 */
export const get_user_rewards = async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const rewards = await RewardService.get_user_rewards(req.logged_user.id);
    res.status(200).json(rewards);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching user rewards:", error);
    res.status(500).json({ error: "Failed to fetch user rewards" });
  }
};

/**
 * POST /api/v1/rewards/:id/redeem
 * Redeem a reward
 */
export const redeem_reward = async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const reward_id = req.params.id;
  const user_id = req.logged_user.id;

  try {
    const result = await RewardService.redeem_reward(user_id, reward_id);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error redeeming reward:", error);
    res.status(500).json({ error: "Failed to redeem reward" });
  }
};

/**
 * POST /api/v1/rewards
 * Create a new reward (admin/operator only)
 */
export const create_reward = async (req, res) => {
  try {
    const reward = await RewardService.create_reward(req.body);
    res.status(201).json(reward);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error creating reward:", error);
    res.status(400).json({ error: "Error creating reward" });
  }
};

/**
 * GET /api/v1/rewards/all
 * Get all rewards for admins/operators
 */
export const get_all_rewards = async (req, res) => {
  try {
    const rewards = await RewardService.get_all_rewards();
    res.status(200).json(rewards);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching all rewards:", error);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
};

/**
 * PUT /api/v1/rewards/:id
 * Update a reward (admin/operator only)
 */
export const update_reward = async (req, res) => {
  try {
    const reward = await RewardService.update_reward(req.params.id, req.body);
    res.status(200).json(reward);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error updating reward:", error);
    res.status(400).json({ error: "Error updating reward" });
  }
};

/**
 * DELETE /api/v1/rewards/:id
 * Delete a reward (admin/operator only)
 */
export const delete_reward = async (req, res) => {
  try {
    const result = await RewardService.delete_reward(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error deleting reward:", error);
    res.status(500).json({ error: "Failed to delete reward" });
  }
};
