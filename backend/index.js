// Entry point: connect to the database, then start listening.
import { config } from "./config/env.js"; // loads .env and validates it first
import connectDB from "./utils/db.js";
import { createApp } from "./app.js";
import { expireStaleOrders } from "./services/maintenance.js";

await connectDB();

// Release items whose buyer never showed up: once at startup, then every hour.
const sweep = () =>
  expireStaleOrders()
    .then((n) => n && console.log(`Released ${n} expired reservation(s)`))
    .catch((err) => console.error("Reservation sweep failed:", err.message));
sweep();
setInterval(sweep, 60 * 60 * 1000);

createApp().listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
