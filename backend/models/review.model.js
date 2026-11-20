import mongoose from "mongoose";

// A buyer's rating of a seller, tied to one completed order.
const reviewSchema = new mongoose.Schema(
  {
    // unique: an order can be reviewed only once
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

// Lookups are always "reviews for this seller, newest first".
reviewSchema.index({ seller: 1, createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
