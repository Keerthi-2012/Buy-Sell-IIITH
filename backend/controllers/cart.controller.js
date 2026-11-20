import { Cart } from "../models/cart.model.js";
import { Item } from "../models/item.model.js";
import { AppError } from "../utils/AppError.js";

const SELLER_FIELDS = "firstName lastName";

// Gets (or creates) the user's cart with item details filled in.
const loadCart = async (userId) => {
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { upsert: true, new: true }
  ).populate({ path: "items.item", populate: { path: "seller", select: SELLER_FIELDS } });

  // Drop entries whose item is gone or out of stock, and trim quantities to what's left.
  const live = cart.items.filter((ci) => ci.item && ci.item.quantity > 0);
  let changed = live.length !== cart.items.length;
  for (const ci of live) {
    if (ci.quantity > ci.item.quantity) {
      ci.quantity = ci.item.quantity;
      changed = true;
    }
  }
  if (changed) {
    cart.items = live;
    await cart.save();
  }
  return cart;
};

// Loads an item the user may put in their cart (exists, isn't theirs, has stock).
const getBuyableItem = async (itemId, userId) => {
  const item = await Item.findById(itemId);
  if (!item) throw new AppError(404, "Item not found");
  if (item.seller.equals(userId)) throw new AppError(400, "You cannot add your own item to the cart");
  if (item.quantity <= 0) throw new AppError(409, "Item is out of stock");
  return item;
};

export const viewCart = async (req, res) => {
  res.json(await loadCart(req.user._id));
};

// Adds units to the cart; adding the same item again increases its quantity (up to the stock).
export const addToCart = async (req, res) => {
  const { itemId, quantity } = req.valid.body;
  const item = await getBuyableItem(itemId, req.user._id);

  // Make sure the cart exists first, then see how many of this item are already in it.
  await Cart.updateOne({ user: req.user._id }, { $setOnInsert: { items: [] } }, { upsert: true });
  const cart = await Cart.findOne({ user: req.user._id });
  const inCart = cart.items.find((ci) => ci.item.equals(item._id))?.quantity ?? 0;

  if (inCart + quantity > item.quantity) {
    throw new AppError(409, `Only ${item.quantity} available` + (inCart ? ` (you already have ${inCart} in your cart)` : ""));
  }

  if (inCart) {
    await Cart.updateOne({ user: req.user._id, "items.item": item._id }, { $inc: { "items.$.quantity": quantity } });
  } else {
    await Cart.updateOne({ user: req.user._id }, { $push: { items: { item: item._id, quantity } } });
  }
  res.json(await loadCart(req.user._id));
};

// Sets the exact quantity of an item already in the cart (for the +/- buttons).
export const setCartQuantity = async (req, res) => {
  const { itemId, quantity } = req.valid.body;
  const item = await getBuyableItem(itemId, req.user._id);
  if (quantity > item.quantity) throw new AppError(409, `Only ${item.quantity} available`);

  const result = await Cart.updateOne(
    { user: req.user._id, "items.item": item._id },
    { $set: { "items.$.quantity": quantity } }
  );
  if (!result.matchedCount) throw new AppError(404, "Item is not in your cart");
  res.json(await loadCart(req.user._id));
};

export const removeFromCart = async (req, res) => {
  const { itemId } = req.valid.body;
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { item: itemId } } });
  res.json({ message: "Item removed from cart", cart: await loadCart(req.user._id) });
};
