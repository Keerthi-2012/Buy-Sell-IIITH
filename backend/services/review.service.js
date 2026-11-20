// Seller reviews: buyers rate the seller once their order is completed.
import { Order } from "../models/order.model.js";
import { Review } from "../models/review.model.js";
import { AppError } from "../utils/AppError.js";

// A buyer rates the seller of one of their completed orders (one review per order).
export const createReview = async (userId, transactionId, { rating, comment }) => {
  const order = await Order.findOne({ transactionId });
  if (!order) throw new AppError(404, "Order not found");
  if (!order.buyer.equals(userId)) throw new AppError(403, "Only the buyer can review this order");
  if (order.status !== "completed") {
    throw new AppError(409, "You can review the seller once the order is completed");
  }

  try {
    return await Review.create({
      order: order._id,
      reviewer: userId,
      seller: order.seller,
      rating,
      comment,
    });
  } catch (err) {
    // The unique index on `order` is what stops a second review, even under a race.
    if (err.code === 11000) throw new AppError(409, "You have already reviewed this order");
    throw err;
  }
};

// Average rating and number of reviews, e.g. { average: 4.5, count: 12 }.
export const sellerRatingSummary = async (sellerId) => {
  const [row] = await Review.aggregate([
    { $match: { seller: sellerId } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return row
    ? { average: Math.round(row.average * 10) / 10, count: row.count }
    : { average: null, count: 0 };
};

// Most recent reviews of a seller, with the reviewer's name.
export const listSellerReviews = (sellerId, limit = 20) =>
  Review.find({ seller: sellerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("reviewer", "firstName lastName")
    .select("rating comment createdAt reviewer");
