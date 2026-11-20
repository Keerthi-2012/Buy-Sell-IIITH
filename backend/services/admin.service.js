// Moderation tools for admins: see every order and listing, and take listings down.
import { Order } from "../models/order.model.js";
import { Item } from "../models/item.model.js";
import { AppError } from "../utils/AppError.js";
import { presentOrder } from "./order.service.js";

// How many rows to skip to reach a given page.
const skipFor = (page, limit) => (page - 1) * limit;

// Every order on the platform, newest first (OTPs are never included).
export const listAllOrders = async ({ status, page, limit }) => {
  const filter = status ? { status } : {};
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate("item", "name price status")
      .populate("buyer", "firstName lastName email")
      .populate("seller", "firstName lastName email"),
    Order.countDocuments(filter),
  ]);
  return { orders: orders.map((o) => presentOrder(o)), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
};

// Every listing in any status, newest first.
export const listAllItems = async ({ status, page, limit }) => {
  const filter = status ? { status } : {};
  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate("seller", "firstName lastName email"),
    Item.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
};

// Deletes a listing. A pending order on it is cancelled first so the buyer isn't left waiting.
export const removeItem = async (itemId, adminId) => {
  const item = await Item.findById(itemId);
  if (!item) throw new AppError(404, "Item not found");

  await Order.updateMany(
    { item: item._id, status: "pending" },
    { status: "cancelled", cancelReason: "removed", cancelledBy: adminId, cancelledAt: new Date() }
  );
  await item.deleteOne();
};
