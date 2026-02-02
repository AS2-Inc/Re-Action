import * as UserService from "../services/user_service.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const result = await UserService.login(email, password);
    res.status(200).json(result);
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
    if (!credential) {
      return res.status(400).json({ error: "Missing Google token" });
    }
    const result = await UserService.google_auth(credential);
    res.status(200).json(result);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Invalid Google token" });
  }
};

export const register = async (req, res) => {
  try {
    const { name, surname, email, password, age } = req.body;
    if (!name || !surname || !email || !password || !age) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email_regex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

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
    const result = await UserService.activate_account(token);
    res.status(200).json(result);
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
    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

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
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
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
