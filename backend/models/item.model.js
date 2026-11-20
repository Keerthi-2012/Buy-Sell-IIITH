import mongoose from "mongoose";

export const ITEM_CONDITIONS = ["new", "used", "refurbished"];
// Status follows stock: available while units are left, reserved if the rest are in pending orders, else sold.
const ITEM_STATUSES = ["available", "reserved", "sold"];

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    price: { type: Number, required: true, min: 0 },
    // Units still free to buy; units in a pending order are already taken out of this.
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
      validate: { validator: Number.isInteger, message: "Quantity must be a whole number" },
    },
    description: { type: String, trim: true, maxlength: 2000 },
    category: { type: String, required: true, lowercase: true, trim: true }, // e.g. "clothing"
    condition: { type: String, enum: ITEM_CONDITIONS, default: "used" },
    status: { type: String, enum: ITEM_STATUSES, default: "available" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Speeds up "my items" lookups and the public listing (in stock, by category, newest first).
itemSchema.index({ seller: 1 });
itemSchema.index({ quantity: 1, category: 1, createdAt: -1 });

export const Item = mongoose.model("Item", itemSchema);
