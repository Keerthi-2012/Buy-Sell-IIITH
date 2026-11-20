import crypto from "crypto";
import { Order } from "../models/order.model.js";
import { Item } from "../models/item.model.js";
import { Cart } from "../models/cart.model.js";
import { AppError } from "../utils/AppError.js";
import { config } from "../config/env.js";
import { generateOtp, hashOtp, verifyOtp, encryptOtp, decryptOtp } from "../utils/otp.js";

const USER_FIELDS = "firstName lastName email contactNumber";
const ITEM_FIELDS = "name price category status";

const populateOrder = (query) =>
  query
    .populate("item", ITEM_FIELDS)
    .populate("buyer", USER_FIELDS)
    .populate("seller", USER_FIELDS)
    .populate("cancelledBy", "firstName lastName");

/**
 * Turns an order document into a client-safe object. Secrets are always
 * stripped; the plaintext OTP is attached only when `revealOtp` is set
 * (i.e. the buyer looking at their own pending order).
 */
export const presentOrder = (order, { revealOtp = false } = {}) => {
  const obj = order.toObject();
  const otp = revealOtp && obj.status === "pending" ? decryptOtp(obj.otpEncrypted) : null;
  delete obj.hashedOTP;
  delete obj.otpEncrypted;
  delete obj.otpAttempts;
  delete obj.otpLockedUntil;
  delete obj.__v;
  if (otp) obj.otp = otp;
  return obj;
};

/**
 * Places one order per item. Items are claimed atomically
 * (available -> reserved), so two buyers can never get the same item.
 * Standalone MongoDB has no transactions, so a failure part-way through
 * undoes its own claims/orders instead.
 */
export const placeOrders = async (buyerId, itemIds) => {
  const ids = [...new Set(itemIds.map(String))];
  if (!ids.length) throw new AppError(400, "No items to order");

  const items = await Item.find({ _id: { $in: ids } });
  if (items.length !== ids.length) {
    throw new AppError(404, "One or more items no longer exist");
  }
  for (const item of items) {
    if (item.seller.equals(buyerId)) {
      throw new AppError(400, "Cannot buy your own item", { itemId: item._id });
    }
  }

  const claimed = [];
  const created = [];
  try {
    for (const item of items) {
      const got = await Item.findOneAndUpdate(
        { _id: item._id, status: "available" },
        { status: "reserved" }
      );
      if (!got) {
        throw new AppError(409, `"${item.name}" is no longer available`, { itemId: item._id });
      }
      claimed.push(item._id);
    }

    const results = [];
    for (const item of items) {
      const otp = generateOtp();
      const order = await Order.create({
        transactionId: crypto.randomUUID(),
        buyer: buyerId,
        seller: item.seller,
        item: item._id,
        itemName: item.name,
        amount: item.price,
        hashedOTP: await hashOtp(otp),
        otpEncrypted: encryptOtp(otp),
      });
      created.push(order._id);
      results.push({ order: presentOrder(order, { revealOtp: true }), otp });
    }

    await Cart.updateOne({ user: buyerId }, { $pull: { items: { item: { $in: claimed } } } });
    return results;
  } catch (err) {
    await Order.deleteMany({ _id: { $in: created } });
    await Item.updateMany({ _id: { $in: claimed }, status: "reserved" }, { status: "available" });
    throw err;
  }
};

export const listPlacedOrders = async (userId) => {
  const orders = await populateOrder(
    Order.find({ buyer: userId }).select("+otpEncrypted").sort({ createdAt: -1 })
  );
  return orders.map((o) => presentOrder(o, { revealOtp: true }));
};

export const listPendingSales = async (userId) => {
  const orders = await populateOrder(
    Order.find({ seller: userId, status: "pending" }).sort({ createdAt: -1 })
  );
  return orders.map((o) => presentOrder(o));
};

export const listCancelledOrders = async (userId) => {
  const orders = await populateOrder(
    Order.find({ status: "cancelled", $or: [{ buyer: userId }, { seller: userId }] }).sort({
      updatedAt: -1,
    })
  );
  return orders.map((o) => presentOrder(o));
};

/** Seller hands over the item and enters the OTP the buyer shows them. */
export const completeOrder = async (transactionId, sellerId, otp) => {
  const order = await Order.findOne({ transactionId }).select("+hashedOTP +otpLockedUntil");
  if (!order) throw new AppError(404, "Order not found");
  if (!order.seller.equals(sellerId)) {
    throw new AppError(403, "Only the seller can complete the order");
  }
  if (order.status !== "pending") {
    throw new AppError(409, `Order is already ${order.status}`);
  }
  if (order.otpLockedUntil && order.otpLockedUntil > new Date()) {
    throw new AppError(429, "Too many wrong OTPs. Try again in a few minutes.");
  }

  if (!(await verifyOtp(otp, order.hashedOTP))) {
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
  await Item.updateOne({ _id: order.item }, { status: "sold" });

  return presentOrder(await populateOrder(Order.findById(done._id)));
};

/** Either party can cancel a pending order; the item goes back on sale. */
export const cancelOrder = async (transactionId, userId) => {
  const order = await Order.findOne({ transactionId });
  if (!order) throw new AppError(404, "Order not found");
  if (!order.buyer.equals(userId) && !order.seller.equals(userId)) {
    throw new AppError(403, "Not authorized to cancel this order");
  }

  const done = await Order.findOneAndUpdate(
    { _id: order._id, status: "pending" },
    { status: "cancelled", cancelledBy: userId, cancelledAt: new Date() },
    { new: true }
  );
  if (!done) throw new AppError(400, "Only pending orders can be cancelled");
  await Item.updateOne({ _id: order.item, status: "reserved" }, { status: "available" });

  return presentOrder(await populateOrder(Order.findById(done._id)));
};
