import rateLimit from "express-rate-limit";
import { config } from "../config/env.js";

// Builds a limiter: at most `limit` requests per `windowMs`, counted by whatever keyGenerator returns.
const make = (windowMs, limit, message, keyGenerator) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.isTest, // tests fire many requests, so don't throttle them
    keyGenerator,
    validate: { keyGeneratorIpFallback: false },
    handler: (_req, res) => res.status(429).json({ message }),
  });

const byIp = (req) => req.ip;

// Login, register and CAS: slows down password guessing.
export const authLimiter = make(15 * 60 * 1000, 20, "Too many attempts, try again later.", byIp);
// Per-user (falls back to IP) so one account can't hammer OTP guesses.
export const otpLimiter = make(
  15 * 60 * 1000,
  15,
  "Too many OTP attempts, try again later.",
  (req) => req.user?._id?.toString() || req.ip
);
// Broad safety net for the whole API.
export const apiLimiter = make(60 * 1000, 300, "Too many requests, slow down.", byIp);
