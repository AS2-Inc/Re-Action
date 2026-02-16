import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import check_role from "../middleware/role_checker.js";
import token_checker from "../middleware/token_checker.js";
import Operator from "../models/operator.js";
import EmailService from "../services/email_service.js";
import operator_dashboard_service from "../services/operator_dashboard_service.js";
import {
  hash_password,
  is_password_valid,
  is_password_weak,
} from "../utils/security.js";

const router = express.Router();

// POST /api/v1/operators/register
router.post(
  "/register",
  token_checker,
  check_role(["admin"]),
  async (req, res) => {
    if (!req.body || !req.body.name || !req.body.surname || !req.body.email) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existing = await Operator.findOne({ email: req.body.email });
    if (existing)
      return res.status(409).json({ error: "Email already exists" });

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
  },
);

router.post("/login", async (req, res) => {
  const operator = await Operator.findOne({ email: req.body.email }).exec();

  if (!operator) {
    return res.status(404).json({ error: "Operator not found" });
  }

  if (!(await is_password_valid(req.body.password, operator.password))) {
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
    email: operator.email,
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

// ============================================
// Dashboard Endpoints (RF10)
// ============================================

/**
 * GET /api/v1/operators/dashboard
 * Get complete dashboard overview for operators
 */
router.get(
  "/dashboard",
  token_checker,
  check_role(["operator", "admin"]),
  async (_req, res) => {
    try {
      const data = await operator_dashboard_service.get_dashboard_overview();
      res.status(200).json(data);
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  },
);

/**
 * GET /api/v1/operators/dashboard/neighborhoods
 * Get summary stats for all neighborhoods
 */
router.get(
  "/dashboard/neighborhoods",
  token_checker,
  check_role(["operator", "admin"]),
  async (_req, res) => {
    try {
      const neighborhoods =
        await operator_dashboard_service.get_neighborhoods_summary();
      res.status(200).json(neighborhoods);
    } catch (error) {
      console.error("Neighborhoods error:", error);
      res.status(500).json({ error: "Failed to fetch neighborhoods" });
    }
  },
);

/**
 * GET /api/v1/operators/dashboard/neighborhoods/:id
 * Get detailed stats for a specific neighborhood
 */
router.get(
  "/dashboard/neighborhoods/:id",
  token_checker,
  check_role(["operator", "admin"]),
  async (req, res) => {
    try {
      const data = await operator_dashboard_service.get_neighborhood_detail(
        req.params.id,
      );
      res.status(200).json(data);
    } catch (error) {
      if (error.message === "Neighborhood not found") {
        return res.status(404).json({ error: error.message });
      }
      console.error("Neighborhood detail error:", error);
      res.status(500).json({ error: "Failed to fetch neighborhood data" });
    }
  },
);

/**
 * GET /api/v1/operators/dashboard/environmental
 * Get environmental indicators across all neighborhoods
 */
router.get(
  "/dashboard/environmental",
  token_checker,
  check_role(["operator", "admin"]),
  async (_req, res) => {
    try {
      const data =
        await operator_dashboard_service.get_environmental_indicators();
      res.status(200).json(data);
    } catch (error) {
      console.error("Environmental indicators error:", error);
      res.status(500).json({ error: "Failed to fetch environmental data" });
    }
  },
);

/**
 * GET /api/v1/operators/reports/stats
 * Generate stats report for a given period
 */
router.get(
  "/reports/stats",
  token_checker,
  check_role(["operator", "admin"]),
  async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      // Default to last 30 days if not specified
      const end = end_date ? new Date(end_date) : new Date();
      const start = start_date
        ? new Date(start_date)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const report = await operator_dashboard_service.generate_stats_report(
        start,
        end,
      );
      res.status(200).json(report);
    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  },
);

export default router;
