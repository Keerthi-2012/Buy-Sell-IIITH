import mongoose from "mongoose";
import { config } from "../config/env.js";

// Connects to MongoDB; there's no point running the API without it, so exit on failure.
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
