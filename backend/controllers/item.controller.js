import { Item } from "../models/item.model.js";
import { AppError } from "../utils/AppError.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const SELLER_FIELDS = "firstName lastName";

const SORTS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  newest: { createdAt: -1 },
};

// Loads an item and checks the caller owns it and it isn't mid-sale.
const getOwnedEditableItem = async (id, userId, action) => {
  const item = await Item.findById(id);
  if (!item) throw new AppError(404, "Item not found");
  if (!item.seller.equals(userId)) throw new AppError(403, "Unauthorized");
  if (item.status !== "available") {
    throw new AppError(409, `Cannot ${action} an item that is ${item.status}`);
  }
  return item;
};

export const createItem = async (req, res) => {
  const item = await Item.create({ ...req.valid.body, seller: req.user._id });
  res.status(201).json(item);
};

// Public listing: only items still for sale, with filters, sorting and pagination.
export const getAllItems = async (req, res) => {
  const { search, category, condition, minPrice, maxPrice, sort, page, limit } = req.valid.query;

  const query = { status: "available" };
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

export const getItemCategories = async (_req, res) => {
  res.json(await Item.distinct("category", { status: "available" }));
};

export const getItemById = async (req, res) => {
  const item = await Item.findById(req.valid.params.id).populate("seller", SELLER_FIELDS);
  if (!item) throw new AppError(404, "Item not found");
  res.json(item);
};

export const updateItem = async (req, res) => {
  const item = await getOwnedEditableItem(req.valid.params.id, req.user._id, "update");
  // Only whitelisted fields (validated) reach here, so `seller`/`status` can't be overwritten.
  item.set(req.valid.body);
  res.json(await item.save());
};

export const deleteItem = async (req, res) => {
  const item = await getOwnedEditableItem(req.valid.params.id, req.user._id, "delete");
  await item.deleteOne();
  res.json({ message: "Item deleted successfully" });
};
