import express from "express";
import token_checker from "../middleware/token_checker.js";
import * as UserController from "../controllers/user_controller.js";

const router = express.Router();

// POST /api/v1/users/login
router.post("/login", UserController.login);

// POST /api/v1/users/auth/google
router.post("/auth/google", UserController.google_auth);

// POST /api/v1/users/register
router.post("/register", UserController.register);

// GET /api/v1/users/me
router.get("/me", token_checker, UserController.get_me);

// GET /api/v1/users/activate
router.get("/activate", UserController.activate);

// POST /api/v1/users/change-password
router.post("/change-password", token_checker, UserController.change_password);

// POST /api/v1/users/forgot-password
router.post("/forgot-password", UserController.forgot_password);

// GET /api/v1/users/me/badges
router.get("/me/badges", token_checker, UserController.get_my_badges);

export default router;
