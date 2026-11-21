import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

// Fallback for /api routes that don't exist.
export const notFound = (_req, res) => res.status(404).json({ message: "Route not found" });

// Last middleware: every error ends up here and leaves as a { message } JSON.
export const errorHandler = (err, req, res, _next) => {
  // Errors we threw on purpose carry their own status and message.
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: "Duplicate value" }); // unique index hit
  }
  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }
  // Anything else is a bug: log it, but don't leak details to the client.
  if (!config.isTest) console.error(`${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ message: "Internal server error" });
};
