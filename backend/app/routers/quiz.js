import express from "express";
import * as QuizController from "../controllers/quiz_controller.js";
import token_checker from "../middleware/token_checker.js";

const router = express.Router();

/**
 * GET /api/v1/quizzes/:id
 * Get a quiz by ID
 */
router.get("/:id", token_checker, QuizController.get_quiz_by_id);

export default router;
