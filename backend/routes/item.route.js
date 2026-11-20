import express from "express";
import {
  createItem,
  getAllItems,
  getItemById,
  getItemCategories,
  updateItem,
  deleteItem,
} from "../controllers/item.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import { createItemBody, updateItemBody, listItemsQuery, idParam } from "../validators/schemas.js";

const router = express.Router();

// Public
router.get("/", validate({ query: listItemsQuery }), h(getAllItems));
router.get("/categories", h(getItemCategories)); // must stay above "/:id"
router.get("/:id", validate({ params: idParam }), h(getItemById));

// Authenticated
router.post("/", isAuthenticated, validate({ body: createItemBody }), h(createItem));
router.put("/:id", isAuthenticated, validate({ params: idParam, body: updateItemBody }), h(updateItem));
router.delete("/:id", isAuthenticated, validate({ params: idParam }), h(deleteItem));

export default router;
