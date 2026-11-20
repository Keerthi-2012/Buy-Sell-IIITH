import express from "express";
import { viewCart, addToCart, setCartQuantity, removeFromCart } from "../controllers/cart.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import { cartItemBody, addToCartBody, cartQuantityBody } from "../validators/schemas.js";

const router = express.Router();
router.use(isAuthenticated); // every cart route is per-user

router.get("/", h(viewCart));
router.post("/add", validate({ body: addToCartBody }), h(addToCart));
router.patch("/item", validate({ body: cartQuantityBody }), h(setCartQuantity));
router.post("/remove", validate({ body: cartItemBody }), h(removeFromCart));

export default router;
