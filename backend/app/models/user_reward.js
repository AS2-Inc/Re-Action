import mongoose, { Schema } from "mongoose";

// Tracks which rewards have been redeemed by which users.
export default mongoose.model(
  "UserReward",
  new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    reward_id: { type: Schema.Types.ObjectId, ref: "Reward" },
    redeemed_at: { type: Date, default: Date.now },
    unique_code: String, // The coupon code generated for the user
  }),
);
