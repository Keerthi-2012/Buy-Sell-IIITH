import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoutes from "./routes/user.route.js";
import itemRoutes from "./routes/item.route.js";
import orderRoutes from "./routes/order.route.js";

dotenv.config({});

const app = express();

// Move express.json() before CORS and other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SESSION_SECRET || "your-session-secret", // Use env var
  resave: false,
  saveUninitialized: true,
}));

const PORT = process.env.PORT || 8000;

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/item", itemRoutes);
app.use("/api/v1/order", orderRoutes);

app.listen(PORT, () => {
    connectDB();
    console.log(`Server running at port ${PORT}`);
});