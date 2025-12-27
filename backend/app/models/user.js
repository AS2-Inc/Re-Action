import mongoose, { Schema } from "mongoose";

// Users include Citizens, Operators, and Admins
export default mongoose.model(
  "User",
  new Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // TODO: hash this
    role: {
      type: String,
      enum: ["citizen", "operator", "admin"],
      default: "citizen",
    },
    neighborhood: { type: Schema.Types.ObjectId, ref: "Neighborhood" },
    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 }, // Daily streak
    tasks_completed: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    active: { type: Boolean, default: false }, // User cannot login if false
    activationToken: String,
    activationTokenExpires: Date,
  }),
);
