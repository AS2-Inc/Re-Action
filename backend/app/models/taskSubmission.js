// app/models/taskSubmission.js
import mongoose, { Schema } from "mongoose";

export default mongoose.model(
  "TaskSubmission",
  new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    submitted_at: { type: Date, default: Date.now },
    // Optional: Store evidence data
    evidence: {
      gps_location: {
        lat: Number,
        lng: Number,
      },
      photo_url: String,
      qr_code_data: String,
    },
  }),
);
