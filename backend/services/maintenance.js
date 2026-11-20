// Background housekeeping that runs on a timer (see index.js).
import { Order } from "../models/order.model.js";
import { restoreStock } from "./item.service.js";
import { config } from "../config/env.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Cancels pending orders older than RESERVATION_DAYS and frees their items; returns how many it released.
export const expireStaleOrders = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - config.reservationDays * DAY_MS);
  const stale = await Order.find({ status: "pending", createdAt: { $lt: cutoff } }).select("_id item quantity");

  let released = 0;
  for (const order of stale) {
    // Compare-and-set: skip it if someone completed or cancelled it in the meantime.
    const done = await Order.findOneAndUpdate(
      { _id: order._id, status: "pending" },
      { status: "cancelled", cancelReason: "expired", cancelledAt: now }
    );
    if (!done) continue;
    await restoreStock(order.item, order.quantity);
    released += 1;
  }
  return released;
};
