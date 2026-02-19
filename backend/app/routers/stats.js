import express from "express";
import * as StatsController from "../controllers/stats_controller.js";

const router = express.Router();

/**
 * GET /api/v1/stats/public
 * Get public aggregated statistics for landing page
 */
router.get("/public", StatsController.get_public_stats);

export default router;
