import { Cart } from "../models/cart.model.js";
import { Item } from "../models/item.model.js";
import { AppError } from "../utils/AppError.js";

const SELLER_FIELDS = "firstName lastName";

const loadCart = async (userId) => {
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, new: true }
  ).populate({ path: "items.item", populate: { path: "seller", select: SELLER_FIELDS } });

  // Drop entries whose item was deleted or is no longer on sale.
  const live = cart.items.filter((ci) => ci.item && ci.item.status === "available");
  if (live.length !== cart.items.length) {
    cart.items = live;
    await cart.save();
  }
  return cart;
};

export const viewCart = async (req, res) => {
  res.json(await loadCart(req.user._id));
};

export const addToCart = async (req, res) => {
  const { itemId } = req.valid.body;

  const item = await Item.findById(itemId);
  if (!item) throw new AppError(404, "Item not found");
  if (item.seller.equals(req.user._id)) {
    throw new AppError(400, "You cannot add your own item to the cart");
  }
  if (item.status !== "available") throw new AppError(409, "Item is no longer available");

  await Cart.updateOne({ user: req.user._id }, { $setOnInsert: { items: [] } }, { upsert: true });
  // Conditional push: one entry per item, so adding the same item twice is a no-op.
  await Cart.updateOne(
    { user: req.user._id, "items.item": { $ne: item._id } },
    { $push: { items: { item: item._id, quantity: 1 } } }
  );

  res.json(await loadCart(req.user._id));
};

export const removeFromCart = async (req, res) => {
  const { itemId } = req.valid.body;
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { item: itemId } } });
  res.json({ message: "Item removed from cart", cart: await loadCart(req.user._id) });
};
