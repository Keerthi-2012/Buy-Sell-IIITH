// Order business logic: placing, listing, completing and cancelling orders.
import crypto from "crypto";
import { Order } from "../models/order.model.js";
import { Item } from "../models/item.model.js";
import { syncItemStatus, restoreStock } from "./item.service.js";
import { Cart } from "../models/cart.model.js";
import { Review } from "../models/review.model.js";
import { AppError } from "../utils/AppError.js";
import { config } from "../config/env.js";
import { generateOtp, hashOtp, verifyOtp, encryptOtp, decryptOtp } from "../utils/otp.js";

// Only these fields of the other person are exposed; never the full user document.
const USER_FIELDS = "firstName lastName email contactNumber";
const DAY_MS = 24 * 60 * 60 * 1000;
const ITEM_FIELDS = "name price category status";

// Fills in the item/buyer/seller details every order response needs.
const populateOrder = (query) =>
  query
    .populate("item", ITEM_FIELDS)
    .populate("buyer", USER_FIELDS)
    .populate("seller", USER_FIELDS)
    .populate("cancelledBy", "firstName lastName");

// Makes an order client-safe: secrets are stripped, and the OTP is added only for the buyer's own pending order.
export const presentOrder = (order, { revealOtp = false } = {}) => {
  const obj = order.toObject();
  const otp = revealOtp && obj.status === "pending" ? decryptOtp(obj.otpEncrypted) : null;
  delete obj.hashedOTP;
  delete obj.otpEncrypted;
  delete obj.otpAttempts;
  delete obj.otpLockedUntil;
  delete obj.__v;
  if (otp) obj.otp = otp;
  // Tell the client when an unfinished order will be released automatically.
  if (obj.status === "pending") {
    obj.expiresAt = new Date(obj.createdAt.getTime() + config.reservationDays * DAY_MS);
  }
  return obj;
};

// Places one order per item (lines = [{ itemId, quantity }]); units are claimed atomically so nobody can oversell, and a failure undoes its own work.
export const placeOrders = async (buyerId, lines) => {
  // Merge repeated items, then make sure every requested item exists.
  const wanted = new Map();
  for (const { itemId, quantity } of lines) {
    wanted.set(String(itemId), (wanted.get(String(itemId)) ?? 0) + quantity);
  }
  if (!wanted.size) throw new AppError(400, "No items to order");

  const items = await Item.find({ _id: { $in: [...wanted.keys()] } });
  if (items.length !== wanted.size) {
    throw new AppError(404, "One or more items no longer exist");
  }
  for (const item of items) {
    if (item.seller.equals(buyerId)) {
      throw new AppError(400, "Cannot buy your own item", { itemId: item._id });
    }
  }

  const claimed = []; // stock we've taken so far (for rollback)
  const created = []; // orders we've created so far (for rollback)
  try {
    // Step 1: take the units out of stock. The quantity check inside the update makes this race-safe.
    for (const item of items) {
      const quantity = wanted.get(String(item._id));
      const got = await Item.findOneAndUpdate(
        { _id: item._id, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } }
      );
      if (!got) {
        throw new AppError(409, `"${item.name}" doesn't have ${quantity} left`, { itemId: item._id });
      }
      claimed.push({ itemId: item._id, quantity });
    }

    // Step 2: every order gets its own OTP, saved hashed and encrypted.
    const results = [];
    for (const item of items) {
      const quantity = wanted.get(String(item._id));
      const otp = generateOtp();
      const order = await Order.create({
        transactionId: crypto.randomUUID(),
        buyer: buyerId,
        seller: item.seller,
        item: item._id,
        itemName: item.name,
        quantity,
        amount: item.price * quantity, // price comes from the item, never from the client
        hashedOTP: await hashOtp(otp),
        otpEncrypted: encryptOtp(otp),
      });
      created.push(order._id);
      results.push({ order: presentOrder(order, { revealOtp: true }), otp });
    }

    // Step 3: bought items no longer belong in the buyer's cart, and statuses follow the new stock.
    await Cart.updateOne({ user: buyerId }, { $pull: { items: { item: { $in: claimed.map((c) => c.itemId) } } } });
    await Promise.all(claimed.map((c) => syncItemStatus(c.itemId)));
    return results;
  } catch (err) {
    // Undo everything so a half-finished checkout leaves no trace.
    await Order.deleteMany({ _id: { $in: created } });
    await Promise.all(claimed.map((c) => restoreStock(c.itemId, c.quantity)));
    throw err;
  }
};

// Everything the user has bought. Includes their own OTPs for pending orders.
export const listPlacedOrders = async (userId) => {
  const orders = await populateOrder(
    Order.find({ buyer: userId }).select("+otpEncrypted").sort({ createdAt: -1 })
  );
  // Attach the buyer's current rating of each seller, so the UI can show it and offer to change it.
  const sellerIds = orders.map((o) => o.seller?._id).filter(Boolean);
  const ratings = await Review.find({ reviewer: userId, seller: { $in: sellerIds } }).sort({ createdAt: -1 });
  const mine = new Map();
  for (const r of ratings) {
    if (!mine.has(String(r.seller))) mine.set(String(r.seller), { rating: r.rating, comment: r.comment }); // newest first
  }
  return orders.map((o) => ({
    ...presentOrder(o, { revealOtp: true }),
    myReview: mine.get(String(o.seller?._id)) ?? null,
  }));
};

// Items the user has sold that are still waiting for handover.
export const listPendingSales = async (userId) => {
  const orders = await populateOrder(
    Order.find({ seller: userId, status: "pending" }).sort({ createdAt: -1 })
  );
  return orders.map((o) => presentOrder(o));
};

// Cancelled orders where the user was either the buyer or the seller.
export const listCancelledOrders = async (userId) => {
  const orders = await populateOrder(
    Order.find({ status: "cancelled", $or: [{ buyer: userId }, { seller: userId }] }).sort({
      updatedAt: -1,
    })
  );
  return orders.map((o) => presentOrder(o));
};

// The seller hands over the item and enters the OTP the buyer shows them.
export const completeOrder = async (transactionId, sellerId, otp) => {
  const order = await Order.findOne({ transactionId }).select("+hashedOTP +otpLockedUntil");
  if (!order) throw new AppError(404, "Order not found");
  if (!order.seller.equals(sellerId)) {
    throw new AppError(403, "Only the seller can complete the order");
  }
  if (order.status !== "pending") {
    throw new AppError(409, `Order is already ${order.status}`);
  }
  // Refuse even correct guesses while the order is locked from too many misses.
  if (order.otpLockedUntil && order.otpLockedUntil > new Date()) {
    throw new AppError(429, "Too many wrong OTPs. Try again in a few minutes.");
  }

  if (!(await verifyOtp(otp, order.hashedOTP))) {
    // Count the miss atomically, and lock the order once the limit is reached.
    const updated = await Order.findByIdAndUpdate(
      order._id,
      { $inc: { otpAttempts: 1 } },
      { new: true }
    ).select("+otpAttempts");
    if (updated.otpAttempts >= config.otp.maxAttempts) {
      await Order.updateOne(
        { _id: order._id },
        { otpAttempts: 0, otpLockedUntil: new Date(Date.now() + config.otp.lockMs) }
      );
    }
    throw new AppError(400, "Incorrect OTP");
  }

  // Compare-and-set so a concurrent cancel/complete can't both win.
  const done = await Order.findOneAndUpdate(
    { _id: order._id, status: "pending" },
    { status: "completed", completedAt: new Date(), otpAttempts: 0 },
    { new: true }
  );
  if (!done) throw new AppError(409, "Order is no longer pending");
  await syncItemStatus(order.item); // may flip to "sold" if that was the last unit

  return presentOrder(await populateOrder(Order.findById(done._id)));
};

// Either side can cancel a pending order; the item goes back on sale.
export const cancelOrder = async (transactionId, userId) => {
  const order = await Order.findOne({ transactionId });
  if (!order) throw new AppError(404, "Order not found");
  if (!order.buyer.equals(userId) && !order.seller.equals(userId)) {
    throw new AppError(403, "Not authorized to cancel this order");
  }

  // Only a still-pending order can be cancelled; the filter makes this race-safe too.
  const done = await Order.findOneAndUpdate(
    { _id: order._id, status: "pending" },
    { status: "cancelled", cancelReason: "cancelled", cancelledBy: userId, cancelledAt: new Date() },
    { new: true }
  );
  if (!done) throw new AppError(400, "Only pending orders can be cancelled");
  await restoreStock(order.item, order.quantity);

  return presentOrder(await populateOrder(Order.findById(done._id)));
};
