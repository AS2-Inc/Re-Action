import mongoose, { Schema } from "mongoose";

export default mongoose.model(
  "Neighborhood",
  new Schema({
    name: { type: String, required: true },
    city: { type: String, required: true },
    total_score: { type: Number, default: 0 }, // Aggregated score from users
    environmental_data: {
      air_quality: Number,
      waste_management: Number,
    },
    // TODO: add coordinates or boundaries for mapping purposes
  }),
);
