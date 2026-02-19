import express from "express";
import * as UserController from "../controllers/user_controller.js";
import token_checker from "../middleware/token_checker.js";
import {
  validate_email_format,
  validate_required,
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

// PUT /api/v1/users/me
router.put(
  "/me",
  token_checker,
  validate_required(["name", "surname"]),
  UserController.update_profile,
);

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

export default router;
