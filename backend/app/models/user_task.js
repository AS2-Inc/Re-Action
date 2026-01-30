import mongoose, { Schema } from "mongoose";

// Tracks tasks specifically assigned to a user for a given period
export default mongoose.model(
  "UserTask",
  new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task_id: { type: Schema.Types.ObjectId, ref: "Task", required: true },

    status: {
      type: String,
      enum: ["ASSIGNED", "COMPLETED", "EXPIRED"],
      default: "ASSIGNED",
    },

    assigned_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true }, // Crucial for rotation logic
  }),
);
