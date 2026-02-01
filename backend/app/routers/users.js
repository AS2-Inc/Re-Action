import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import token_checker from "../middleware/token_checker.js";
import User from "../models/user.js";
import Badge from "../models/badge.js";
import EmailService from "../services/email_service.js";
import {
  hash_password,
  is_password_weak,
  is_password_valid,
} from "../utils/security.js";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// TODO: implement the auth with Google OAuth2
// POST /api/v1/users/login
router.post("/login", async (req, res) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email }).exec();

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!(await is_password_valid(req.body.password, user.password))) {
    return res.status(401).json({ error: "Wrong password" });
  }

  // The account must be active
  if (!user.is_active) {
    return res.status(403).json({ error: "Account not activated" });
  }

  // Create Token Payload
  var payload = {
    email: user.email,
    id: user._id,
    role: "citizen",
  };

  var options = { expiresIn: 86400 }; // the session last for 24 hours
  var token = jwt.sign(payload, process.env.SUPER_SECRET, options);

  res.json({
    token: token,
    email: user.email,
    id: user._id,
    self: `/api/v1/users/${user._id}`,
  });
});

/**
 * POST /api/v1/users/auth/google
 * Google OAuth2 Authentication
 * Verifies the Google ID token and logs in or registers the user.
 */
router.post("/auth/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: "Missing Google token" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    // Check if user already exists
    let user = await User.findOne({ email: email }).exec();

    if (!user) {
      user = new User({
        name: given_name,
        surname: family_name,
        email: email,
        auth_provider: "google",
        is_active: true,
      });
      await user.save();
    }

    // Create Token Payload (Same as login)
    const jwtPayload = {
      email: user.email,
      id: user._id,
      role: "citizen",
    };

    const options = { expiresIn: 86400 };
    const token = jwt.sign(jwtPayload, process.env.SUPER_SECRET, options);

    res.json({
      token: token,
      email: user.email,
      id: user._id,
      self: `/api/v1/users/${user._id}`,
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// POST /api/v1/users/register (Registration for a user- RF1)
router.post("/register", async (req, res) => {
  if (
    !req.body ||
    !req.body.name ||
    !req.body.surname ||
    !req.body.email ||
    !req.body.password ||
    !req.body.age
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const existing = await User.findOne({ email: req.body.email });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  // Check if the email is in a valid format
  const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email_regex.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (is_password_weak(req.body.password)) {
    return res.status(400).json({ error: "Password is too weak" });
  }
  // TODO: neighborhood existence check?

  const activation_token = crypto.randomBytes(20).toString("hex");

  // Set expiration to 12 hours from now (per requirement RF1)
  const activation_expires = Date.now() + 12 * 60 * 60 * 1000;
  // create the user with the neighborhood only if provided
  const hashed_password = await hash_password(req.body.password);

  let user = new User({
    name: req.body.name,
    surname: req.body.surname,
    email: req.body.email,
    password: hashed_password,
    age: req.body.age,
    neighborhood_id: req.body.neighborhood || null,
    activation_token: activation_token,
    activation_token_expires: activation_expires,
  });

  try {
    user = await user.save();

    // TODO: Implement actual email sending later
    // const activationLink = `http://localhost:8080/api/v1/users/activate?token=${activationToken}`;

    res.status(201).json();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Error creating user" });
  }
});

// GET /api/v1/users/me (Dashboard Data - RF3/RF5)
// Requires Token
router.get("/me", token_checker, async (req, res) => {
  const logged_user = req.logged_user;

  const user = await User.findOne({ email: logged_user.email }).exec();

  if (!user) return res.status(404).send();

  res.status(200).json({
    name: user.name,
    surname: user.surname,
    // TODO: add more if necessary for the frontend
  });
});

/**
 * GET /api/v1/users/activate
 * Activation Endpoint - Verifies the token and activates the user
 */
router.get("/activate", async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ error: "Token missing" });
  }

  // Find user with this token AND ensure token hasn't expired ($gt = greater than now)
  const user = await User.findOne({
    activation_token: token,
    activation_token_expires: { $gt: Date.now() },
  }).exec();

  if (!user) {
    return res
      .status(400)
      .json({ error: "Invalid or expired activation token" });
  }

  user.is_active = true;
  user.activation_token = undefined;
  user.activation_token_expires = undefined;

  await user.save();

  // TODO: Redirect to frontend login page with success message
  // res.redirect('http://localhost:5173/login?activated=true');

  res
    .status(200)
    .send({ message: "Account activated successfully. You can now log in." });
});

router.post("/change-password", token_checker, async (req, res) => {
  const { current_password, new_password } = req.body;

  // Validate input
  if (!current_password || !new_password) {
    return res
      .status(400)
      .json({ error: "Current password and new password are required" });
  }

  // Find the logged-in user
  const user = await User.findById(req.logged_user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Verify current password
  if (!(await is_password_valid(current_password, user.password))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  if (is_password_weak(new_password)) {
    return res.status(400).json({ error: "Password is too weak" });
  }

  // Don't allow same password
  if (current_password === new_password) {
    return res
      .status(400)
      .json({ error: "New password must be different from current password" });
  }

  // Update password
  user.password = await hash_password(new_password);
  await user.save();

  res.status(200).json({ message: "Password changed successfully" });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Find user by email
  const user = await User.findOne({ email: email });

  // Always return success even if user doesn't exist (security best practice)
  // This prevents email enumeration attacks
  if (!user) {
    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent",
    });
  }

  // Generate reset token
  const reset_token = crypto.randomBytes(32).toString("hex");
  const reset_expires = Date.now() + 60 * 60 * 1000; // 1 hour from now

  // Save reset token to user
  user.reset_password_token = reset_token;
  user.reset_password_expires = reset_expires;
  await user.save();

  await EmailService.send_password_reset_email(user.email, reset_token);

  res.status(200).json({
    message:
      "If an account with that email exists, a password reset link has been sent",
  });
});

/**
 * GET /api/v1/users/me/badges
 * Get all badges with earned status for the logged-in user
 */
router.get("/me/badges", token_checker, async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await User.findById(req.logged_user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const allBadges = await Badge.find({}).sort({ display_order: 1 });
    const userBadgeIds = user.badges_id.map((id) => id.toString());

    const badges = allBadges.map((badge) => ({
      ...badge.toObject(),
      earned: userBadgeIds.includes(badge._id.toString()),
    }));

    res.status(200).json(badges);
  } catch (error) {
    console.error("Error fetching badges:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

export default router;
