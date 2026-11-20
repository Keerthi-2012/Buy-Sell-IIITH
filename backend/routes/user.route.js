import express from "express";
import { register, login, logout, getProfile, updateProfile, casLogin } from "../controllers/user.controller.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { asyncHandler as h } from "../utils/asyncHandler.js";
import { registerBody, loginBody, updateProfileBody } from "../validators/schemas.js";

const router = express.Router();

router.post("/register", authLimiter, validate({ body: registerBody }), h(register));
router.post("/login", authLimiter, validate({ body: loginBody }), h(login));
router.get("/cas-login", authLimiter, h(casLogin));
router.get("/logout", logout);

router.get("/profile", isAuthenticated, getProfile);
router.put("/update", isAuthenticated, validate({ body: updateProfileBody }), h(updateProfile));

export default router;
