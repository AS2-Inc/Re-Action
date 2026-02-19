import mongoose, { Schema } from "mongoose";

export default mongoose.model(
  "Neighborhood",
  new Schema({
    name: { type: String, required: true },
    city: { type: String, required: true },

    // --- Core Ranking Fields ---
    base_points: { type: Number, default: 0 }, // Sum of all approved task points from neighborhood users
    normalized_points: { type: Number, default: 0 }, // base_points adjusted for neighborhood size
    ranking_position: Number,
    last_ranking_update: Date,
    // --- Aggregated Environmental / Impact Totals ---
    environmental_data: {
      co2_saved: { type: Number, default: 0 }, // total kg CO2 saved
      waste_recycled: { type: Number, default: 0 }, // total kg waste recycled
      km_green: { type: Number, default: 0 }, // total green km
      last_updated: { type: Date, default: Date.now },
    },
  }),
);
