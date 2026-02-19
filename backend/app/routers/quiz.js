import express from "express";
import * as QuizController from "../controllers/quiz_controller.js";
import check_role from "../middleware/role_checker.js";
import token_checker from "../middleware/token_checker.js";

const router = express.Router();

/**
 * GET /api/v1/quizzes
 * List quizzes (operators/admin only)
 */
router.get(
  "",
  token_checker,
  check_role(["operator"]),
  QuizController.list_quizzes,
);

/**
 * POST /api/v1/quizzes
 * Create a new quiz (operators/admin only)
 */
router.post(
  "",
  token_checker,
  check_role(["operator"]),
  QuizController.create_quiz,
);

/**
 * GET /api/v1/quizzes/:id
 * Get a quiz by ID
 */
router.get("/:id", token_checker, QuizController.get_quiz_by_id);

export default router;
