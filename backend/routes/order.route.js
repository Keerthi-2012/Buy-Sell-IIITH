import express from "express";
import {
  createOrder,
  checkout,
  getPlacedOrders,
  getSoldOrders,
  getCancelledOrders,
  completeOrder,
  cancelOrder,
} from "../controllers/order.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { validate } from "../middleware/validate.js";
import { otpLimiter } from "../middleware/rateLimit.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import {
  createOrderBody,
  checkoutBody,
  transactionParam,
  completeOrderBody,
} from "../validators/schemas.js";

const router = express.Router();

// Every order route needs a logged-in user; "who" always comes from the session.
router.use(isAuthenticated);

router.post("/", validate({ body: createOrderBody }), h(createOrder)); // buy one item now
router.post("/checkout", validate({ body: checkoutBody }), h(checkout)); // buy cart (or chosen items)

router.get("/placed", h(getPlacedOrders)); // I'm the buyer (includes my OTPs for pending orders)
router.get("/sold", h(getSoldOrders)); // I'm the seller, awaiting delivery
router.get("/cancelled", h(getCancelledOrders));

router.patch(
  "/:transactionId/complete",
  otpLimiter,
  validate({ params: transactionParam, body: completeOrderBody }),
  h(completeOrder)
);
router.patch("/:transactionId/cancel", validate({ params: transactionParam }), h(cancelOrder));

export default router;
