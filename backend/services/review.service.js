// Seller reviews: a buyer rates a seller once they've completed an order with them.
// Each buyer counts once per seller, however many orders they place; rating again just updates it.
import { Order } from "../models/order.model.js";
import { Review } from "../models/review.model.js";
import { AppError } from "../utils/AppError.js";

const saveRating = (review, rating, comment) => {
  review.rating = rating;
  review.comment = comment ?? "";
  return review.save();
};

// Rates (or re-rates) the seller of one of the buyer's completed orders. `created` is false on an update.
export const createReview = async (userId, transactionId, { rating, comment }) => {
  const order = await Order.findOne({ transactionId });
  if (!order) throw new AppError(404, "Order not found");
  if (!order.buyer.equals(userId)) throw new AppError(403, "Only the buyer can review this order");
  if (order.status !== "completed") {
    throw new AppError(409, "You can review the seller once the order is completed");
  }

  // Already rated this seller (possibly from an earlier order)? Update that rating instead of adding one.
  const existing = await Review.findOne({ reviewer: userId, seller: order.seller }).sort({ createdAt: -1 });
  if (existing) return { review: await saveRating(existing, rating, comment), created: false };

  try {
    const review = await Review.create({ order: order._id, reviewer: userId, seller: order.seller, rating, comment });
    return { review, created: true };
  } catch (err) {
    if (err.code !== 11000) throw err;
    // Two submissions for the same order raced and the other one won, so update its review.
    const raced = await Review.findOne({ order: order._id });
    return { review: await saveRating(raced, rating, comment), created: false };
  }
};

// Average rating and number of buyers who rated, e.g. { average: 4.5, count: 12 }.
// Only each buyer's latest rating counts, which also keeps older duplicate reviews from inflating it.
export const sellerRatingSummary = async (sellerId) => {
  const [row] = await Review.aggregate([
    { $match: { seller: sellerId } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$reviewer", rating: { $first: "$rating" } } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return row
    ? { average: Math.round(row.average * 10) / 10, count: row.count }
    : { average: null, count: 0 };
};

// Most recent reviews of a seller (one per buyer, their latest), with the reviewer's name.
export const listSellerReviews = async (sellerId, limit = 20) => {
  const all = await Review.find({ seller: sellerId })
    .sort({ createdAt: -1 })
    .limit(500)
    .populate("reviewer", "firstName lastName")
    .select("rating comment createdAt reviewer");

  const seen = new Set();
  return all
    .filter((r) => {
      const key = String(r.reviewer?._id);
      if (seen.has(key)) return false; // an older review by someone we've already listed
      seen.add(key);
      return true;
    })
    .slice(0, limit);
};
