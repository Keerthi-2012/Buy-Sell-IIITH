import express from "express";
import {
  createItem,
  getAllItems,
  getItemById,
  getItemCategories,
  getMyItems,
  updateItem,
  deleteItem,
} from "../controllers/item.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import { createItemBody, updateItemBody, listItemsQuery, idParam } from "../validators/schemas.js";

const router = express.Router();

// Anyone can browse
router.get("/", validate({ query: listItemsQuery }), h(getAllItems));
router.get("/categories", h(getItemCategories)); // must stay above "/:id"
router.get("/mine", isAuthenticated, h(getMyItems)); // also above "/:id", or "mine" is read as an id
router.get("/:id", validate({ params: idParam }), h(getItemById));

// Selling needs an account; edit/delete are limited to the owner inside the controller
router.post("/", isAuthenticated, validate({ body: createItemBody }), h(createItem));
router.put("/:id", isAuthenticated, validate({ params: idParam, body: updateItemBody }), h(updateItem));
router.delete("/:id", isAuthenticated, validate({ params: idParam }), h(deleteItem));

export default router;
