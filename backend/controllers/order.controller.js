import { Cart } from "../models/cart.model.js";
import { AppError } from "../utils/AppError.js";
import * as orders from "../services/order.service.js";

// POST /order  { item }  -- "Buy now" for a single item.
// Buyer, seller and price all come from the server, never from the request.
export const createOrder = async (req, res) => {
  const [result] = await orders.placeOrders(req.user._id, [req.valid.body.item]);
  res.status(201).json(result);
};

// POST /order/checkout  { items?: [id] }  -- items default to the whole cart.
export const checkout = async (req, res) => {
  let itemIds = req.valid.body.items;

  if (!itemIds) {
    const cart = await Cart.findOne({ user: req.user._id });
    itemIds = cart?.items.map((ci) => ci.item.toString()) ?? [];
  }
  if (!itemIds.length) throw new AppError(400, "Cart is empty");

  const results = await orders.placeOrders(req.user._id, itemIds);
  res.status(201).json({ message: "Orders placed successfully", orders: results });
};

export const getPlacedOrders = async (req, res) => {
  res.json(await orders.listPlacedOrders(req.user._id));
};

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

export const cancelOrder = async (req, res) => {
  res.json(await orders.cancelOrder(req.valid.params.transactionId, req.user._id));
};
