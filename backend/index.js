import { config } from "./config/env.js"; // loads .env and validates it first
import connectDB from "./utils/db.js";
import { createApp } from "./app.js";

await connectDB();

createApp().listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
