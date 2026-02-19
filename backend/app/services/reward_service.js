import crypto from "node:crypto";
import ServiceError from "../errors/service_error.js";
import Reward from "../models/reward.js";
import User from "../models/user.js";
import UserReward from "../models/user_reward.js";

/**
 * Get active rewards for a user based on their neighborhood
 * @param {string} user_id - The user ID
 * @returns {Promise<Array>} Array of active rewards
 */
export const get_active_rewards = async (user_id) => {
  const user = await User.findById(user_id);
  if (!user) {
    throw new ServiceError(404, "User not found");
  }

  const rewards = await Reward.find({
    active: true,
    $or: [
      { expiry_date: { $exists: false } },
      { expiry_date: { $gt: new Date() } },
    ],
  });

  // Filter rewards based on user's neighborhood
  const user_neighborhood_id = user.neighborhood_id?.toString();
  const filtered_rewards = rewards.filter((reward) => {
    // If reward has no neighborhoods assigned, it's available to everyone
    if (!reward.neighborhoods || reward.neighborhoods.length === 0) {
      return true;
    }
    // If reward has neighborhoods, only show if user is in one of them
    return reward.neighborhoods.some(
      (neighborhood_id) => neighborhood_id.toString() === user_neighborhood_id,
    );
  });

  return filtered_rewards;
};

/**
 * Get all rewards redeemed by a user
 * @param {string} user_id - The user ID
 * @returns {Promise<Array>} Array of user's redeemed rewards
 */
export const get_user_rewards = async (user_id) => {
  const my_rewards = await UserReward.find({ user_id })
    .populate("reward_id")
    .sort({ redeemed_at: -1 });

  // Filter out rewards that have been deleted from the database
  return my_rewards.filter((ur) => ur.reward_id !== null);
};

/**
 * Redeem a reward for a user
 * @param {string} user_id - The user ID
 * @param {string} reward_id - The reward ID to redeem
 * @returns {Promise<Object>} Redemption details
 */
export const redeem_reward = async (user_id, reward_id) => {
  const reward = await Reward.findById(reward_id);
  if (!reward) {
    throw new ServiceError("Reward not found", 404);
  }

  if (!reward.active) {
    throw new ServiceError("Reward is no longer active", 400);
  }

  if (reward.quantity_available <= 0) {
    throw new ServiceError("Reward is out of stock", 400);
  }

  if (reward.expiry_date && new Date(reward.expiry_date) < new Date()) {
    throw new ServiceError("Reward has expired", 400);
  }

  const user = await User.findById(user_id);
  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  if (user.points < reward.points_cost) {
    throw new ServiceError("Insufficient points", 400);
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

  return {
    message: "Reward redeemed successfully",
    reward_title: reward.title,
    points_remaining: user.points,
    code: unique_code,
  };
};

/**
 * Create a new reward
 * @param {Object} reward_data - The reward data
 * @returns {Promise<Object>} Created reward
 */
export const create_reward = async (reward_data) => {
  const reward = new Reward(reward_data);
  await reward.save();
  return reward;
};

/**
 * Get all rewards (admin/operator only)
 * @returns {Promise<Array>} All rewards
 */
export const get_all_rewards = async () => {
  return await Reward.find()
    .populate("neighborhoods", "name")
    .sort({ active: -1, created_at: -1 });
};

/**
 * Update a reward
 * @param {string} reward_id - The reward ID
 * @param {Object} update_data - The data to update
 * @returns {Promise<Object>} Updated reward
 */
export const update_reward = async (reward_id, update_data) => {
  const reward = await Reward.findByIdAndUpdate(reward_id, update_data, {
    new: true,
    runValidators: true,
  }).populate("neighborhoods", "name");

  if (!reward) {
    throw new ServiceError(404, "Reward not found");
  }

  return reward;
};

/**
 * Delete a reward
 * @param {string} reward_id - The reward ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const delete_reward = async (reward_id) => {
  const reward = await Reward.findByIdAndDelete(reward_id);
  if (!reward) {
    throw new ServiceError(404, "Reward not found");
  }
  return { message: "Reward deleted successfully" };
};
