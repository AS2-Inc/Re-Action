import user_dashboard_service from "../services/user_dashboard_service.js";
import * as UserService from "../services/user_service.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await UserService.login(email, password);

    // Set JWT in HttpOnly cookie
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return user info without token
    res.status(200).json({
      email: result.email,
      id: result.id,
      self: result.self,
    });
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    } else if (error.message === "Wrong password") {
      return res.status(401).json({ error: error.message });
    } else if (error.message === "Account not activated") {
      return res.status(403).json({ error: error.message });
    }
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const google_auth = async (req, res) => {
  try {
    const { credential } = req.body;
    const result = await UserService.google_auth(credential);

    // Set JWT in HttpOnly cookie
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return user info without token
    res.status(200).json({
      email: result.email,
      id: result.id,
      self: result.self,
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Invalid Google token" });
  }
};

export const register = async (req, res) => {
  try {
    await UserService.register(req.body);
    res.status(201).json();
  } catch (error) {
    if (error.message === "Email already exists") {
      return res.status(409).json({ error: error.message });
    }
    if (error.message === "Password is too weak") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Registration Error:", error);
    res.status(400).json({ error: "Error creating user" });
  }
};

export const get_me = async (req, res) => {
  try {
    const result = await UserService.get_user_profile(req.logged_user.email);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).send();
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const activate = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "Token missing" });
    }
    await UserService.activate_account(token);

    const frontend_base_url =
      process.env.FRONTEND_BASE_URL || "http://localhost:5173";
    return res.redirect(`${frontend_base_url}/login?activated=true`);
  } catch (error) {
    if (error.message === "Invalid or expired activation token") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Activation error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const change_password = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await UserService.change_password(
      req.logged_user.id,
      current_password,
      new_password,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "User not found") {
      // Should be 404
      return res.status(404).json({ error: error.message });
    }
    if (error.message === "Current password is incorrect") {
      return res.status(401).json({ error: error.message });
    }
    if (
      error.message === "Password is too weak" ||
      error.message === "New password must be different from current password"
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Change Password Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const forgot_password = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await UserService.forgot_password(email);
    res.status(200).json(result);
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const get_my_badges = async (req, res) => {
  try {
    const result = await UserService.get_badges(req.logged_user.id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "User not found")
      return res.status(404).json({ error: error.message });
    console.error("Get Badges Error:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
};

/**
 * GET /api/v1/users/me/dashboard
 * Returns complete dashboard data for the logged-in user (RF3)
 */
export const get_dashboard = async (req, res) => {
  try {
    const result = await user_dashboard_service.get_dashboard_data(
      req.logged_user.id,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Get Dashboard Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

/**
 * GET /api/v1/users/me/history
 * Returns paginated action history for the logged-in user (RF3)
 */
export const get_history = async (req, res) => {
  try {
    const { page, limit, type } = req.query;
    const options = {
      page: page ? Number.parseInt(page, 10) : 1,
      limit: limit ? Number.parseInt(limit, 10) : 20,
      type: type || "all",
    };

    const result = await user_dashboard_service.get_history(
      req.logged_user.id,
      options,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Get History Error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

/**
 * GET /api/v1/users/me/stats
 * Returns aggregated statistics for the logged-in user (RF3)
 */
export const get_stats = async (req, res) => {
  try {
    const result = await user_dashboard_service.get_stats(req.logged_user.id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Get Stats Error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
