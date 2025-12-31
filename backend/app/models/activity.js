// app/models/taskSubmission.js
import mongoose, { Schema } from "mongoose";

// The class representing a user's submission for a task, including verification status.
export default mongoose.model(
  "Activity",
  new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    neighborhood_id: { type: Schema.Types.ObjectId, ref: "Neighborhood" }, // Denormalized for easier aggregation
    task_id: { type: Schema.Types.ObjectId, ref: "Task", required: true },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    proof: {
      gps_trace: [[Number]], // Array of coordinates
      photo_url: String, // For waste reporting
      qr_scan_data: String,
      quiz_score: Number,
    },

    // Admin/Operator Handling (RF10, RF12)
    verified_by: { type: Schema.Types.ObjectId, ref: "User" }, // If manual verification
    rejection_reason: String,

    points_awarded: { type: Number, default: 0 },
    submitted_at: { type: Date, default: Date.now },
    completed_at: { type: Date },
  }),
);
