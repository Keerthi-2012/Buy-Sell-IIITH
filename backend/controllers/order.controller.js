// Thin HTTP layer for orders; the real logic lives in services/order.service.js.
import { Cart } from "../models/cart.model.js";
import { AppError } from "../utils/AppError.js";
import { assertProfileComplete } from "../utils/roles.js";
import * as orders from "../services/order.service.js";
import * as reviews from "../services/review.service.js";

// POST /order { item, quantity? }: buy now; buyer, seller and price come from the server.
export const createOrder = async (req, res) => {
  assertProfileComplete(req.user);
  const { item, quantity } = req.valid.body;
  const [result] = await orders.placeOrders(req.user._id, [{ itemId: item, quantity }]);
  res.status(201).json(result);
};

// POST /order/checkout { items?: [id] }: buys the cart (or just the chosen cart items) at the quantities in the cart.
export const checkout = async (req, res) => {
  assertProfileComplete(req.user);

  const cart = await Cart.findOne({ user: req.user._id });
  let lines = cart?.items.map((ci) => ({ itemId: ci.item.toString(), quantity: ci.quantity })) ?? [];

  // Optionally narrow it to some of the cart's items ("Buy now" on one row).
  const chosen = req.valid.body.items;
  if (chosen) {
    if (chosen.some((id) => !lines.some((l) => l.itemId === id))) {
      throw new AppError(400, "Some items are not in your cart");
    }
    lines = lines.filter((l) => chosen.includes(l.itemId));
  }
  if (!lines.length) throw new AppError(400, "Cart is empty");

  const results = await orders.placeOrders(req.user._id, lines);
  res.status(201).json({ message: "Orders placed successfully", orders: results });
};

// Orders where I'm the buyer.
export const getPlacedOrders = async (req, res) => {
  res.json(await orders.listPlacedOrders(req.user._id));
};

// Orders where I'm the seller and the handover hasn't happened yet.
export const getSoldOrders = async (req, res) => {
  res.json(await orders.listPendingSales(req.user._id));
};

export const getCancelledOrders = async (req, res) => {
  res.json(await orders.listCancelledOrders(req.user._id));
};

// PATCH /order/:transactionId/complete  { otp }  -- seller confirms delivery.
export const completeOrder = async (req, res) => {
  res.json(
    await orders.completeOrder(req.valid.params.transactionId, req.user._id, req.valid.body.otp)
  );
};

// POST /order/:transactionId/review  { rating, comment? }  -- buyer rates (or re-rates) the seller.
export const createReview = async (req, res) => {
  const { review, created } = await reviews.createReview(req.user._id, req.valid.params.transactionId, req.valid.body);
  res.status(created ? 201 : 200).json(review); // 200 when it updated an existing rating
};

export const cancelOrder = async (req, res) => {
  res.json(await orders.cancelOrder(req.valid.params.transactionId, req.user._id));
};
