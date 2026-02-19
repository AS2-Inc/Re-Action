import express from "express";
import check_role from "../middleware/role_checker.js";
import token_checker from "../middleware/token_checker.js";
import * as RewardController from "../controllers/reward_controller.js";

const router = express.Router();

/**
 * GET /api/v1/rewards
 * List all active rewards for the user's neighborhood
 */
router.get("/", token_checker, RewardController.get_active_rewards);

/**
 * POST /api/v1/rewards/:id/redeem
 * Redeem a reward
 */
router.post("/:id/redeem", token_checker, RewardController.redeem_reward);

/**
 * GET /api/v1/rewards/my-rewards
 * List rewards redeemed by the logged-in user
 */
router.get("/my-rewards", token_checker, RewardController.get_user_rewards);

/**
 * POST /api/v1/rewards
 * Create a new reward (admin/operator only)
 */
router.post(
  "/",
  token_checker,
  check_role(["admin", "operator"]),
  RewardController.create_reward,
);

/**
 * GET /api/v1/rewards/all
 * List ALL rewards (active and inactive) for operators/admins
 */
router.get(
  "/all",
  token_checker,
  check_role(["operator"]),
  RewardController.get_all_rewards,
);

/**
 * PUT /api/v1/rewards/:id
 * Update a reward (admin/operator only)
 */
router.put(
  "/:id",
  token_checker,
  check_role(["admin", "operator"]),
  RewardController.update_reward,
);

/**
 * DELETE /api/v1/rewards/:id
 * Delete a reward (admin/operator only)
 */
router.delete(
  "/:id",
  token_checker,
  check_role(["admin", "operator"]),
  RewardController.delete_reward,
);

export default router;
