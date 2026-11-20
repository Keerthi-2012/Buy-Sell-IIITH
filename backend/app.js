import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/env.js";
import userRoutes from "./routes/user.route.js";
import itemRoutes from "./routes/item.route.js";
import cartRoutes from "./routes/cart.route.js";
import orderRoutes from "./routes/order.route.js";
import reviewRoutes from "./routes/review.route.js";
import adminRoutes from "./routes/admin.route.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds the Express app without starting it, so tests can use it without opening a port.
export const createApp = () => {
  const app = express();

  // Behind a reverse proxy, trust it so rate limiting sees real client IPs.
  if (config.trustProxy) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet()); // sensible security headers
  app.use(
    cors({
      origin: (origin, cb) =>
        // no Origin header = same-origin / curl / server-to-server
        !origin || config.clientOrigins.includes(origin)
          ? cb(null, true)
          : cb(new Error("Not allowed by CORS")),
      credentials: true, // lets the browser send the login cookie
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // API routes, all behind a general rate limit.
  app.use("/api/v1", apiLimiter);
  app.use("/api/v1/user", userRoutes);
  app.use("/api/v1/item", itemRoutes);
  app.use("/api/v1/cart", cartRoutes);
  app.use("/api/v1/order", orderRoutes);
  app.use("/api/v1/review", reviewRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api", notFound);

  // In production the backend also serves the built frontend.
  if (config.isProd) {
    const distPath = path.join(__dirname, "../frontend/dist");
    app.use(express.static(distPath));
    // Any other URL gets index.html so client-side routing works on refresh.
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.use(errorHandler); // must come last
  return app;
};
