import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import ServiceError from "../errors/service_error.js";
import Badge from "../models/badge.js";
import User from "../models/user.js";
import {
  hash_password,
  is_password_valid,
  is_password_weak,
} from "../utils/security.js";
import EmailService from "./email_service.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const login = async (email, password) => {
  const user = await User.findOne({ email }).exec();

  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  if (!(await is_password_valid(password, user.password))) {
    throw new ServiceError("Wrong password", 401);
  }

  if (!user.is_active) {
    throw new ServiceError("Account not activated", 403);
  }

  const payload = {
    email: user.email,
    id: user._id,
    role: "citizen",
  };

  const options = { expiresIn: 86400 }; // 24 hours
  const token = jwt.sign(payload, process.env.SUPER_SECRET, options);

  return {
    token,
    email: user.email,
    id: user._id,
    self: `/api/v1/users/${user._id}`,
  };
};

export const google_auth = async (credential) => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { email, given_name, family_name } = payload;

  let user = await User.findOne({ email }).exec();

  if (!user) {
    user = new User({
      name: given_name,
      surname: family_name,
      email: email,
      auth_provider: "google",
      is_active: true,
      neighborhood_id: null,
    });
    await user.save();
  }

  const jwt_payload = {
    email: user.email,
    id: user._id,
    role: "citizen",
  };

  const options = { expiresIn: 86400 };
  const token = jwt.sign(jwt_payload, process.env.SUPER_SECRET, options);

  return {
    token,
    email: user.email,
    id: user._id,
    self: `/api/v1/users/${user._id}`,
  };
};

export const register = async (user_data) => {
  const { name, surname, email, password, age, neighborhood } = user_data;

  const existing = await User.findOne({ email });
  if (existing) {
    if (!existing.is_active && existing.auth_provider === "local") {
      if (is_password_weak(password)) {
        throw new ServiceError("Password is too weak", 400);
      }

      const activation_token = crypto.randomBytes(20).toString("hex");
      const activation_expires = Date.now() + 12 * 60 * 60 * 1000;

      existing.name = name;
      existing.surname = surname;
      existing.age = age;
      existing.neighborhood_id = neighborhood || null;
      existing.password = await hash_password(password);
      existing.activation_token = activation_token;
      existing.activation_token_expires = activation_expires;

      await existing.save();
      await EmailService.send_activation_email(email, activation_token);
      return existing;
    }

    throw new ServiceError("Email already exists", 409);
  }

  if (is_password_weak(password)) {
    throw new ServiceError("Password is too weak", 400);
  }

  const activation_token = crypto.randomBytes(20).toString("hex");
  const activation_expires = Date.now() + 12 * 60 * 60 * 1000;
  const hashed_password = await hash_password(password);

  const user = new User({
    name,
    surname,
    email,
    password: hashed_password,
    age,
    neighborhood_id: neighborhood || null,
    activation_token,
    activation_token_expires: activation_expires,
  });

  await user.save();

  await EmailService.send_activation_email(email, activation_token);

  return user;
};

export const get_user_profile = async (email) => {
  const user = await User.findOne({ email }).exec();
  if (!user) throw new ServiceError("User not found", 404);
  return {
    name: user.name,
    surname: user.surname,
  };
};

export const activate_account = async (token) => {
  const user = await User.findOne({
    activation_token: token,
    activation_token_expires: { $gt: Date.now() },
  }).exec();

  if (!user) {
    throw new ServiceError("Invalid or expired activation token", 400);
  }

  user.is_active = true;
  user.activation_token = undefined;
  user.activation_token_expires = undefined;

  await user.save();
  return { message: "Account activated successfully. You can now log in." };
};

export const change_password = async (
  user_id,
  current_password,
  new_password,
) => {
  const user = await User.findById(user_id);
  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  if (!(await is_password_valid(current_password, user.password))) {
    throw new ServiceError("Current password is incorrect", 401);
  }

  if (is_password_weak(new_password)) {
    throw new ServiceError("Password is too weak", 400);
  }

  if (current_password === new_password) {
    throw new ServiceError(
      "New password must be different from current password",
      400,
    );
  }

  user.password = await hash_password(new_password);
  await user.save();

  return { message: "Password changed successfully" };
};

export const forgot_password = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    // Return success to prevent enumeration
    return {
      message:
        "If an account with that email exists, a password reset link has been sent",
    };
  }

  const reset_token = crypto.randomBytes(32).toString("hex");
  const reset_expires = Date.now() + 60 * 60 * 1000;

  user.reset_password_token = reset_token;
  user.reset_password_expires = reset_expires;
  await user.save();

  await EmailService.send_password_reset_email(user.email, reset_token);

  return {
    message:
      "If an account with that email exists, a password reset link has been sent",
  };
};

export const get_badges = async (user_id) => {
  const user = await User.findById(user_id);
  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  const all_badges = await Badge.find({}).sort({ display_order: 1 });
  const user_badge_ids = user.badges_id.map((id) => id.toString());

  return all_badges.map((badge) => ({
    ...badge.toObject(),
    earned: user_badge_ids.includes(badge._id.toString()),
  }));
};
