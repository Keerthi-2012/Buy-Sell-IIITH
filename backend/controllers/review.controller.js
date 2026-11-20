import { sellerRatingSummary, listSellerReviews } from "../services/review.service.js";
import mongoose from "mongoose";

// GET /review/seller/:id  -- public: a seller's rating summary plus their recent reviews.
export const getSellerReviews = async (req, res) => {
  const sellerId = new mongoose.Types.ObjectId(req.valid.params.id);
  const [summary, reviews] = await Promise.all([
    sellerRatingSummary(sellerId),
    listSellerReviews(sellerId),
  ]);
  res.json({ summary, reviews });
};
