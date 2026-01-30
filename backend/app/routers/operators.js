import express from "express";
import crypto from "node:crypto";
import token_checker from "../middleware/token_checker.js";
import Operator from "../models/operator.js";
import EmailService from "../services/email_service.js";
import {
  hash_password,
  is_password_weak,
  is_password_valid,
} from "../utils/security.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /api/v1/operators/register
router.post("/register", token_checker, async (req, res) => {
  if (!req.logged_user || req.logged_user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Forbidden: Insufficient privileges" });
  }

  if (!req.body || !req.body.name || !req.body.surname || !req.body.email) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const existing = await Operator.findOne({ email: req.body.email });
  if (existing) return res.status(409).json({ error: "Email already exists" });

  const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email_regex.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const activation_token = crypto.randomBytes(20).toString("hex");
  const activation_expires = Date.now() + 12 * 60 * 60 * 1000;

  let operator = new Operator({
    name: req.body.name,
    surname: req.body.surname,
    email: req.body.email,
    password: crypto.randomBytes(32).toString("hex"),
    role: "operator",
    activation_token: activation_token,
    activation_token_expires: activation_expires,
  });

  try {
    operator = await operator.save();
    await EmailService.send_activation_email(
      operator.email,
      operator.activation_token,
    );
    res.status(201).json();
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Error creating user" });
  }
});

router.post("/login", async (req, res) => {
  const operator = await Operator.findOne({ email: req.body.email }).exec();

  if (!operator) {
    return res.status(404).json({ error: "Operator not found" });
  }

  if (!is_password_valid(req.body.password, operator.password)) {
    return res.status(401).json({ error: "Wrong password" });
  }

  // The account must be active
  if (!operator.is_active) {
    return res.status(403).json({ error: "Account not activated" });
  }

  if (operator.password_to_set) {
    return res.status(403).json({ error: "Password not set" });
  }

  // Create Token Payload
  var payload = {
    email: operator.email,
    id: operator._id,
    role: operator.role,
  };

  var options = { expiresIn: 86400 }; // the session last for 24 hours
  var token = jwt.sign(payload, process.env.SUPER_SECRET, options);

  res.json({
    token: token,
    email: operator.email,
    id: operator._id,
    self: `/api/v1/operators/${operator._id}`,
  });
});

// GET /api/v1/operators/me
router.get("/me", token_checker, async (req, res) => {
  const logged_user = req.logged_user;

  const operator = await Operator.findOne({ email: logged_user.email }).exec();

  if (!operator) return res.status(404).send();

  res.status(200).json({
    name: operator.name,
    surname: operator.surname,
    role: operator.role,
    // TODO: add more if necessary for the frontend
  });
});

/**
 * GET /api/v1/operators/activate
 * Activation Endpoint - Verifies the token and activates the operator
 */
router.post("/activate", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required" });
  }

  if (is_password_weak(password)) {
    return res.status(400).json({ error: "Password is too weak" });
  }

  // Find user with this token AND ensure token hasn't expired
  const operator = await Operator.findOne({
    activation_token: token,
    activation_token_expires: { $gt: Date.now() },
  });

  if (!operator) {
    return res
      .status(400)
      .json({ error: "Invalid or expired activation token" });
  }

  if (operator.role !== "operator") {
    return res
      .status(403)
      .json({ error: "This endpoint is only for operators" });
  }

  operator.password = await hash_password(password);
  operator.is_active = true;
  operator.activation_token = undefined;
  operator.activation_token_expires = undefined;

  await operator.save();

  res
    .status(200)
    .json({ message: "Password set successfully. You can now log in." });
});

export default router;
