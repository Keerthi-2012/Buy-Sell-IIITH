import { Item } from "../models/item.model.js";
import { Order } from "../models/order.model.js";
import { AppError } from "../utils/AppError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { assertProfileComplete } from "../utils/roles.js";
import { sellerRatingSummary } from "../services/review.service.js";
import { syncItemStatus } from "../services/item.service.js";

// Public listings only show the seller's name, not their email.
const SELLER_FIELDS = "firstName lastName";

// Maps the ?sort= value to a MongoDB sort.
const SORTS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  newest: { createdAt: -1 },
};

// Loads an item and checks the caller owns it.
const getOwnedItem = async (id, userId) => {
  const item = await Item.findById(id);
  if (!item) throw new AppError(404, "Item not found");
  if (!item.seller.equals(userId)) throw new AppError(403, "Unauthorized");
  return item;
};

export const createItem = async (req, res) => {
  assertProfileComplete(req.user); // buyers need a way to reach the seller
  // The seller is always the logged-in user, whatever the body says.
  const item = await Item.create({ ...req.valid.body, seller: req.user._id });
  res.status(201).json(item);
};

// Public listing: only items with stock left, with filters, sorting and pagination.
export const getAllItems = async (req, res) => {
  const { search, category, condition, minPrice, maxPrice, sort, page, limit } = req.valid.query;

  // Build the MongoDB filter from whichever query params were given.
  const query = { quantity: { $gt: 0 } };
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    query.$or = [{ name: re }, { description: re }];
  }
  if (category) query.category = category;
  if (condition) query.condition = condition;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  // Fetch the requested page and the total count in parallel.
  const [items, total] = await Promise.all([
    Item.find(query)
      .populate("seller", SELLER_FIELDS)
      .sort(SORTS[sort] ?? SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Item.countDocuments(query),
  ]);

  res.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
};

// Categories that currently have something for sale (feeds the filter and sell forms).
export const getItemCategories = async (_req, res) => {
  res.json(await Item.distinct("category", { quantity: { $gt: 0 } }));
};

// The logged-in user's own listings in every status (reserved and sold included).
export const getMyItems = async (req, res) => {
  res.json(await Item.find({ seller: req.user._id }).sort({ createdAt: -1 }));
};

export const getItemById = async (req, res) => {
  const item = await Item.findById(req.valid.params.id).populate("seller", SELLER_FIELDS);
  if (!item) throw new AppError(404, "Item not found");
  // Attach the seller's rating so the item page can show it without a second request.
  const sellerRating = await sellerRatingSummary(item.seller._id);
  res.json({ ...item.toObject(), sellerRating });
};

export const updateItem = async (req, res) => {
  const item = await getOwnedItem(req.valid.params.id, req.user._id);
  const changes = req.valid.body; // only whitelisted, validated fields reach here, so `seller`/`status` can't be overwritten

  // If the stock is being set, make sure nobody bought a unit since we read it.
  const filter = { _id: item._id };
  if (changes.quantity !== undefined) filter.quantity = item.quantity;

  const updated = await Item.findOneAndUpdate(filter, { $set: changes }, { new: true, runValidators: true });
  if (!updated) throw new AppError(409, "Stock changed while you were editing. Reload and try again.");

  await syncItemStatus(updated._id);
  res.json(await Item.findById(updated._id));
};

export const deleteItem = async (req, res) => {
  const item = await getOwnedItem(req.valid.params.id, req.user._id);
  // Buyers are waiting on pending orders, so those have to be finished or cancelled first.
  if (await Order.exists({ item: item._id, status: "pending" })) {
    throw new AppError(409, "Cannot delete an item that has pending orders");
  }
  await item.deleteOne();
  res.json({ message: "Item deleted successfully" });
};
