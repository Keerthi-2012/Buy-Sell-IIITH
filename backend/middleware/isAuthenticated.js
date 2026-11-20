import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Auth is a single httpOnly JWT cookie (set on login/register/CAS).
const isAuthenticated = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new AppError(401, "User not authenticated");

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }

  const user = decoded?.id && (await User.findById(decoded.id));
  if (!user) throw new AppError(401, "User not found");

  req.user = user;
  next();
});

export default isAuthenticated;
