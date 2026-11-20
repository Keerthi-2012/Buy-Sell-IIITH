import express from "express";
import { getSellerReviews } from "../controllers/review.controller.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import { idParam } from "../validators/schemas.js";

const router = express.Router();

// Public: anyone can read a seller's reviews (creating one is POST /order/:id/review).
router.get("/seller/:id", validate({ params: idParam }), h(getSellerReviews));

export default router;
