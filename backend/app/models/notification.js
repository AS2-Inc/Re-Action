import mongoose, { Schema } from "mongoose";

// Not used for now, but could be useful for future features like personalized recommendations
const notification_schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["feedback", "info", "motivational", "reward", "system"],
    required: true,
  },
  channel: {
    type: String,
    enum: ["in-app", "email", "push"],
    default: "in-app",
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Notification", notification_schema);
