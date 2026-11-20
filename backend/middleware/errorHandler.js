import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const notFound = (_req, res) => res.status(404).json({ message: "Route not found" });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: "Duplicate value" });
  }
  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }
  if (!config.isTest) console.error(`${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ message: "Internal server error" });
};
