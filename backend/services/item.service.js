// Stock helpers shared by orders, cancellations and the expiry sweep.
import { Item } from "../models/item.model.js";
import { Order } from "../models/order.model.js";

// Recomputes an item's status from its stock and pending orders.
export const syncItemStatus = async (itemId) => {
  const item = await Item.findById(itemId).select("quantity");
  if (!item) return;
  let status = "available";
  if (item.quantity <= 0) {
    status = (await Order.exists({ item: itemId, status: "pending" })) ? "reserved" : "sold";
  }
  await Item.updateOne({ _id: itemId }, { status });
};

// Gives units back to the shelf (a cancelled or expired order) and refreshes the status.
export const restoreStock = async (itemId, quantity) => {
  await Item.updateOne({ _id: itemId }, { $inc: { quantity } });
  await syncItemStatus(itemId);
};
