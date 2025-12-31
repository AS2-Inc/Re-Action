import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import token_checker from "../middleware/token_checker.js";
import User from "../models/user.js";
import Activity from "../models/activity.js";

const router = express.Router();

// TODO: implement the auth with Google OAuth2
// POST /api/v1/users/login
router.post("/login", async (req, res) => {
  // Find user by email
  const user = await User.findOne({ email: req.body.email }).exec();

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Check password (Plain text for lab, use bcrypt for production)
  if (user.password !== req.body.password) {
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
    role: user.role, // Important for RBAC
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

// POST /api/v1/users/register (Registration for a user- RF1)
router.post("/register", async (req, res) => {
  if (
    !req.body ||
    !req.body.name ||
    !req.body.surname ||
    !req.body.email ||
    !req.body.password
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

  // TODO: Check if the password meets minimum security criteria (example: at least 6 characters)

  // TODO: neighborhood existence check?

  const activation_token = crypto.randomBytes(20).toString("hex");

  // Set expiration to 12 hours from now (per requirement RF1)
  const activation_expires = Date.now() + 12 * 60 * 60 * 1000;
  // create the user with the neighborhood only if provided
  let user = new User({
    first_name: req.body.name,
    surname: req.body.surname,
    email: req.body.email,
    password: req.body.password,
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

// POST /api/v1/users/operator (Registration for an operator - RF1)
router.post("/operator", token_checker, async (req, res) => {
  // Check if the user has admin privileges
  if (!req.logged_user || req.logged_user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Insufficient privileges" });
  }
  if (!req.body || !req.body.name || !req.body.surname || !req.body.email) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const existing = await User.findOne({ email: req.body.email });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  // Check if the email is in a valid format
  const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email_regex.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const activation_token = crypto.randomBytes(20).toString("hex");

  // Set expiration to 12 hours from now (per requirement RF1)
  const activation_expires = Date.now() + 12 * 60 * 60 * 1000;
  // Create the operator without a password - they will set it during activation
  let user = new User({
    name: req.body.name,
    surname: req.body.surname,
    email: req.body.email,
    password: crypto.randomBytes(32).toString("hex"), // Temporary random password
    role: "operator",
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
  // req.logged_user is set by tokenChecker
  // should return 401 when token is invalid
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await User.findById(req.logged_user.id).populate(
    "neighborhood_id",
  );
  if (!user) return res.status(404).send();

  const tasks_completed = await Activity.countDocuments({
    user_id: user._id,
    status: "APPROVED",
  });

  if (user.role === "citizen") {
    res.status(200).json({
      name: user.name,
      points: user.points,
      streak: user.streak,
      neighborhood_id: user.neighborhood_id,
      tasks_completed: tasks_completed,
    });
  } else {
    res.status(200).json({
      name: user.name,
      role: user.role,
    });
  }
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
  });

  if (!user) {
    return res
      .status(400)
      .json({ error: "Invalid or expired activation token" });
  }

  // If user is an operator, redirect to password setup page
  if (user.role === "operator") {
    // TODO: Redirect to frontend password setup page
    // res.redirect(`http://localhost:5173/set-password?token=${token}`);
    return res.status(200).json({
      message: "Please set your password",
      token: token,
      requires_password_setup: true,
    });
  }

  // For regular users (citizens), activate immediately
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

/**
 * POST /api/v1/users/set-password
 * Allows operators to set their password during activation
 */
router.post("/set-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required" });
  }

  // TODO Check if the password meets minimum security criteria (at least 6 characters)

  // Find user with this token AND ensure token hasn't expired
  const user = await User.findOne({
    activation_token: token,
    activation_token_expires: { $gt: Date.now() },
  });

  if (!user) {
    return res
      .status(400)
      .json({ error: "Invalid or expired activation token" });
  }

  // Only operators should use this endpoint
  if (user.role !== "operator") {
    return res
      .status(403)
      .json({ error: "This endpoint is only for operators" });
  }

  // Set password and activate the account
  user.password = password; // TODO: hash this in production
  user.is_active = true;
  user.activation_token = undefined;
  user.activation_token_expires = undefined;

  await user.save();

  res
    .status(200)
    .json({ message: "Password set successfully. You can now log in." });
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
  if (user.password !== current_password) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  // TODO: Add password strength validation
  if (new_password.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters long" });
  }

  // Don't allow same password
  if (current_password === new_password) {
    return res
      .status(400)
      .json({ error: "New password must be different from current password" });
  }

  // Update password
  user.password = new_password; // TODO: hash this in production
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

  // TODO: Implement actual email sending
  // const resetLink = `http://localhost:5173/reset-password?token=${reset_token}`;
  // await sendEmail(user.email, 'Password Reset', `Click here to reset your password: ${resetLink}`);

  // For now, return the token in the response (only for development)
  res.status(200).json({
    message:
      "If an account with that email exists, a password reset link has been sent",
    token: reset_token, // Remove this in production
  });
});

/**
 * POST /api/v1/users/reset-password
 * Reset password using the token from forgot-password
 */
router.post("/reset-password", async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res
      .status(400)
      .json({ error: "Reset token and new password are required" });
  }

  // TODO: Add password strength validation
  if (new_password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  // Find user with this reset token AND ensure token hasn't expired
  const user = await User.findOne({
    reset_password_token: token,
    reset_password_expires: { $gt: Date.now() },
  });

  if (!user) {
    return res
      .status(400)
      .json({ error: "Invalid or expired reset token" });
  }

  // Update password and clear reset token
  user.password = new_password; // TODO: hash this in production
  user.reset_password_token = undefined;
  user.reset_password_expires = undefined;
  await user.save();

  res
    .status(200)
    .json({ message: "Password reset successfully. You can now log in." });
});

export default router;
