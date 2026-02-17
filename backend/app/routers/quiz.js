import express from "express";
import token_checker from "../middleware/token_checker.js";
import Quiz from "../models/quiz.js";

const router = express.Router();

/**
 * GET /api/v1/quizzes/:id
 * Get a quiz by ID
 */
router.get("/:id", token_checker, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    res.status(200).json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
});

export default router;
