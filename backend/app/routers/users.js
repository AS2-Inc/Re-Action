import express from "express";
import token_checker from "../middleware/token_checker.js";
import * as UserController from "../controllers/user_controller.js";
import {
  validate_required,
  validate_email_format,
} from "../middleware/validation.js";

const router = express.Router();

// POST /api/v1/users/login
router.post(
  "/login",
  validate_required(["email", "password"]),
  UserController.login,
);

// POST /api/v1/users/auth/google
router.post(
  "/auth/google",
  validate_required(["credential"]),
  UserController.google_auth,
);

// POST /api/v1/users/register
router.post(
  "/register",
  validate_required(["name", "surname", "email", "password", "age"]),
  validate_email_format,
  UserController.register,
);

// GET /api/v1/users/me
router.get("/me", token_checker, UserController.get_me);

// GET /api/v1/users/activate
router.get("/activate", UserController.activate);

// POST /api/v1/users/change-password
router.post(
  "/change-password",
  token_checker,
  validate_required(["current_password", "new_password"]),
  UserController.change_password,
);

// POST /api/v1/users/forgot-password
router.post(
  "/forgot-password",
  validate_required(["email"]),
  UserController.forgot_password,
);

// GET /api/v1/users/me/badges
router.get("/me/badges", token_checker, UserController.get_my_badges);

// GET /api/v1/users/me/dashboard (RF3: Complete dashboard data)
router.get("/me/dashboard", token_checker, UserController.get_dashboard);

// GET /api/v1/users/me/history (RF3: Action history with pagination)
router.get("/me/history", token_checker, UserController.get_history);

// GET /api/v1/users/me/stats (RF3: Aggregated statistics)
router.get("/me/stats", token_checker, UserController.get_stats);

export default router;
