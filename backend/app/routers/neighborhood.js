import express from "express";
import Neighborhood from "../models/neighborhood.js";
import leaderboard_service from "../services/leaderboard_service.js";

const router = express.Router();

/**
 * GET /api/v1/neighborhood
 * List all neighborhoods
 */
router.get("", async (_req, res) => {
  try {
    const neighborhoods = await Neighborhood.find();
    res.status(200).json(neighborhoods);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

/**
 * GET /api/v1/neighborhood/ranking
 * Get neighborhoods ranked by normalized points (RF17, RF18)
 * Query params: period (weekly|monthly|annually|all_time), limit
 */
router.get("/ranking", async (req, res) => {
  try {
    const { period = "all_time", limit = 20 } = req.query;

    const leaderboard = await leaderboard_service.get_leaderboard({
      period,
      limit: Number.parseInt(limit, 10),
    });

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error("Ranking error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/v1/neighborhood/ranking/simple
 * Get simple ranking based on raw base_points (legacy endpoint)
 */
router.get("/ranking/simple", async (_req, res) => {
  try {
    const neighborhoods = await Neighborhood.find().sort({ base_points: -1 });

    const ranked = neighborhoods.map((n, index) => ({
      ...n.toObject(),
      rank: index + 1,
    }));

    res.status(200).json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/v1/neighborhood/:id
 * Get neighborhood by ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const neighborhood = await Neighborhood.findById(id);
    if (neighborhood) {
      res.status(200).json(neighborhood);
    } else {
      res.status(404).json({ error: "Neighborhood Not Found" });
    }
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

export default router;
