import mongoose, { Schema } from "mongoose";

// The class representing a Task that users can complete to earn points.
export default mongoose.model(
  "Task",
  new Schema({
    // Optional Neighborhood Specificity
    neighborhood_id: { type: Schema.Types.ObjectId, ref: "Neighborhood" },

    title: { type: String, required: true },
    description: { type: String },

    category: {
      type: String,
      enum: ["Mobility", "Waste", "Community", "Volunteering"],
      required: true,
    },

    // Gamification
    difficulty: { type: String, enum: ["Low", "Medium", "High"] },
    base_points: { type: Number, required: true },

    // Verification Logic (RF12)
    verification_method: {
      type: String,
      enum: ["GPS", "QR_SCAN", "PHOTO_UPLOAD", "QUIZ", "MANUAL_REPORT"],
      required: true,
    },
    // Technical criteria for auto-verification
    verification_criteria: {
      min_distance_meters: Number, // For walking tasks
      target_location: { type: [Number] }, // For park visits
      qr_code_secret: String, // For validating QR scans
      quiz_id: Schema.Types.ObjectId, // If it's a quiz
    },

    // Impact Metrics for User Ambient Stats (RF4)
    impact_metrics: {
      co2_saved: { type: Number, default: 0 }, // kg
      waste_recycled: { type: Number, default: 0 }, // kg
      distance: { type: Number, default: 0 }, // km
    },

    // Scheduling
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "on_demand"],
      default: "on_demand",
    },
    is_active: { type: Boolean, default: true },

    repeatable: { type: Boolean, default: false },
    cooldown_hours: { type: Number, default: 24 }, // Only if repeatable

    // Admin Metadata
    created_at: { type: Date, default: Date.now },
  }),
);
