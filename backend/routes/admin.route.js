import express from "express";
import { getOrders, getItems, removeItem } from "../controllers/admin.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import { adminListQuery, idParam } from "../validators/schemas.js";

const router = express.Router();
router.use(isAuthenticated, requireAdmin); // everything here is admin-only

router.get("/orders", validate({ query: adminListQuery }), h(getOrders));
router.get("/items", validate({ query: adminListQuery }), h(getItems));
router.delete("/items/:id", validate({ params: idParam }), h(removeItem));

export default router;
