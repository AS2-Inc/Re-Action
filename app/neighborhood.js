import express from "express";
import Neighborhood from "./models/neighborhood.js";

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
 * GET /api/v1/neighborhood/:id
 * Get neighborhood by ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const neighborhood = await Neighborhood.findByPk(id);
    if (neighborhood) {
      res.status(200).json(neighborhood);
    } else {
      res.status(404).json({ error: "Neighborhood Not Found" });
    }
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
