import mongoose, { Schema } from "mongoose";

export default mongoose.model(
  "Neighborhood",
  new Schema({
    name: { type: String, required: true },
    city: { type: String, required: true },
    total_score: { type: Number, default: 0 }, // Aggregated score from users
    ranking_position: Number,
    normalized_score: Number,
    last_ranking_update: Date,
    // Open Data Integration (RF13, RF17)
    environmental_data: {
      air_quality_index: Number,
      waste_management: Number,
      improvement_trend: Number,
      last_updated: Date,
    },
    active_goals: [
      {
        description: String,
        target_points: Number,
        current_points: Number,
        is_completed: { type: Boolean, default: false },
        deadline: Date,
      },
    ],
    // TODO: add coordinates or boundaries for mapping purposes
  }),
);
