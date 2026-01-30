import mongoose, { Schema } from "mongoose";

export default mongoose.model(
  "Operator",
  new Schema({
    name: String,
    surname: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["operator", "admin"],
      default: "operator",
      required: true,
    },
    is_active: { type: Boolean, default: false },

    activation_token: String,
    activation_token_expires: Date,

    reset_password_token: String,
    reset_password_expires: Date,
  }),
);
