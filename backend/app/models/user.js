import mongoose, { Schema } from "mongoose";

// Users include Citizens, Operators, and Admins
export default mongoose.model(
  "User",
  new Schema({
    first_name: String,
    last_name: String,
    surname: String,
    age: Number,
    email: { type: String, required: true, unique: true },
    age: { type: Number, required: true },
    // null if using OAuth
    password: { type: String, required: true }, // TODO: hash this
    auth_provider: {
      type: String,
      enum: ["local", "google", "spid"],
      default: "local",
    },
    role: {
      type: String,
      enum: ["citizen", "operator", "admin"],
      default: "citizen",
      required: true,
    },
    neighborhood_id: { type: Schema.Types.ObjectId, ref: "Neighborhood" },

    // Gamification State (RF4)
    points: { type: Number, default: 0 },
    level: { type: String, default: "Cittadino Base" }, // e.g., 'King della sostenibilità'
    badges_id: [
      {
        type: Schema.Types.ObjectId,
        ref: "Badge",
      },
    ],

    // Streak Logic
    streak: { type: Number, default: 0 }, // Daily streak
    last_activity_date: Date, // For streak calculation

    ambient: {
      co2_saved: { type: Number, default: 0 }, // in kg
      waste_recycled: { type: Number, default: 0 }, // in kg
      km_green: { type: Number, default: 0 }, // km
    },

    notification_preferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      daily: { type: Boolean, default: false },
      positive_reinforcement: { type: Boolean, default: true },
      informational: { type: Boolean, default: true },
      motivational: { type: Boolean, default: true },
      // TODO
    },

    language: { type: String, default: "it", enum: ["it", "en", "de"] }, // RNF3

    is_active: { type: Boolean, default: false }, // Activated after email verification
    activation_token: String,
    activation_token_expires: Date,

    // Password reset tokens
    reset_password_token: String,
    reset_password_expires: Date,
  }),
);
