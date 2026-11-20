import express from "express";
import { viewCart, addToCart, removeFromCart } from "../controllers/cart.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import { cartItemBody } from "../validators/schemas.js";

const router = express.Router();
router.use(isAuthenticated);

router.get("/", h(viewCart));
router.post("/add", validate({ body: cartItemBody }), h(addToCart));
router.post("/remove", validate({ body: cartItemBody }), h(removeFromCart));

export default router;
