import mongoose, { Schema } from "mongoose";

export default mongoose.model(
  "User",
  new Schema({
    name: String,
    surname: String,
    email: { type: String, required: true, unique: true },
    age: { type: Number },
    // null/random if using OAuth
    password: { type: String, required: false },
    auth_provider: {
      type: String,
      enum: ["local", "google", "spid"],
      default: "local",
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

    // Aggregated stats for badge efficiency
    stats: {
      total_tasks_completed: { type: Number, default: 0 },
      tasks_by_category: {
        type: Map,
        of: Number,
        default: {},
      },
    },

    notification_preferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      daily: { type: Boolean, default: false },
      positive_reinforcement: { type: Boolean, default: true },
      informational: { type: Boolean, default: true },
      motivational: { type: Boolean, default: true },
    },

    language: { type: String, default: "it", enum: ["it", "en", "de"] }, // RNF3

    is_active: { type: Boolean, default: false }, // Activated after email verification
    activation_token: String,

    // Password reset tokens
    reset_password_token: String,
  }),
);
