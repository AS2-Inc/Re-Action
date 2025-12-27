import mongoose, { Schema } from "mongoose";

export default mongoose.model(
  "Task",
  new Schema({
    title: { type: String, required: true },
    description: String,
    points: { type: Number, required: true }, // Reward points
    difficulty: { type: String, enum: ["low", "medium", "high"] },
    category: { type: String, enum: ["mobility", "waste", "community"] },
    verification_method: { type: String, enum: ["gps", "qr", "manual"] },
    active: { type: Boolean, default: true },
  }),
);
