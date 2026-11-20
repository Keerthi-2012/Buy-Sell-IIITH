// Thin HTTP layer for admin tools; logic lives in services/admin.service.js.
import * as admin from "../services/admin.service.js";

export const getOrders = async (req, res) => {
  res.json(await admin.listAllOrders(req.valid.query));
};

export const getItems = async (req, res) => {
  res.json(await admin.listAllItems(req.valid.query));
};

export const removeItem = async (req, res) => {
  await admin.removeItem(req.valid.params.id, req.user._id);
  res.json({ message: "Item removed" });
};
