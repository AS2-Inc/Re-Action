import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import tokenChecker from "../tokenChecker.js";

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
  if (!user.active) {
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // TODO: Check if the password meets minimum security criteria (example: at least 6 characters)

  // TODO: neighborhood existence check?

  const activationToken = crypto.randomBytes(20).toString("hex");

  // Set expiration to 12 hours from now (per requirement RF1)
  const activationExpires = Date.now() + 12 * 60 * 60 * 1000;
  // create the user with the neighborhood only if provided
  let user = new User({
    name: req.body.name,
    surname: req.body.surname,
    email: req.body.email,
    password: req.body.password,
    neighborhood: req.body.neighborhood || null,
    activationToken: activationToken,
    activationTokenExpires: activationExpires,
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
router.post("/operator", tokenChecker, async (req, res) => {
  // Check if the user has admin privileges
  if (!req.loggedUser || req.loggedUser.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Insufficient privileges" });
  }
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // TODO: Check if the password meets minimum security criteria (at least 6 characters)

  const activationToken = crypto.randomBytes(20).toString("hex");

  // Set expiration to 12 hours from now (per requirement RF1)
  const activationExpires = Date.now() + 12 * 60 * 60 * 1000;
  // create the user with the neighborhood only if provided
  let user = new User({
    name: req.body.name,
    surname: req.body.surname,
    email: req.body.email,
    password: req.body.password,
    role: "operator",
    activationToken: activationToken,
    activationTokenExpires: activationExpires,
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
router.get("/me", tokenChecker, async (req, res) => {
  // req.loggedUser is set by tokenChecker
  const user = await User.findById(req.loggedUser.id).populate("neighborhood");
  if (!user) return res.status(404).send();

  res.status(200).json({
    name: user.name,
    points: user.points,
    streak: user.streak,
    neighborhood: user.neighborhood,
    tasks_completed: user.tasks_completed.length,
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
    activationToken: token,
    activationTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res
      .status(400)
      .json({ error: "Invalid or expired activation token" });
  }

  // Activate user and clear token fields
  user.active = true;
  user.activationToken = undefined;
  user.activationTokenExpires = undefined;

  await user.save();

  // TODO: Redirect to frontend login page with success message
  // res.redirect('http://localhost:5173/login?activated=true');

  res.status(200).send("<h1>Account activated! You can now log in.</h1>");
});

export default router;
