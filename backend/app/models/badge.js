import mongoose, { Schema } from "mongoose";

// Badge model representing achievements users can earn
export default mongoose.model(
  "Badge",
  new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String }, // URL or emoji icon
    category: {
      type: String,
      enum: ["Points", "Tasks", "Streak", "Environmental", "Special"],
      required: true,
    },

    // Conditions for earning this badge
    requirements: {
      // Points thresholds
      min_points: { type: Number },

      // Task completion thresholds
      min_tasks_completed: { type: Number },
      tasks_by_category: {
        Mobility: { type: Number },
        Waste: { type: Number },
        Community: { type: Number },
        Volunteering: { type: Number },
      },

      // Streak requirements
      min_streak: { type: Number },

      // Environmental impact
      min_co2_saved: { type: Number }, // in kg
      min_waste_recycled: { type: Number }, // in kg
      min_km_green: { type: Number }, // km
    },

    // Badge rarity level
    rarity: {
      type: String,
      enum: ["Common", "Rare", "Epic", "Legendary"],
      default: "Common",
    },

    // Order for display (lower numbers shown first)
    display_order: { type: Number, default: 0 },

    created_at: { type: Date, default: Date.now },
  }),
);
