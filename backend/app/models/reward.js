import mongoose, { Schema } from "mongoose";

// All types of rewards that can be redeemed by users.
export default mongoose.model(
  "Reward",
  new Schema({
    title: { type: String, required: true },
    description: String,
    points_cost: { type: Number, required: true }, // Points required to redeem
    type: { type: String, enum: ["COUPON", "DIGITAL_BADGE", "PHYSICAL_ITEM"] },
    provider: String, // e.g., "Trento Transport"
    quantity_available: { type: Number, default: 0 }, // Stock available
    active: { type: Boolean, default: true }, // If false, reward cannot be redeemed
    expiry_date: Date,
    neighborhoods: [{ type: Schema.Types.ObjectId, ref: "Neighborhood" }], // Neighborhoods where this reward is available
  }),
);
