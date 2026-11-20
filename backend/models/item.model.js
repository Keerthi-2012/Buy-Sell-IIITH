import mongoose from "mongoose";

export const ITEM_CONDITIONS = ["new", "used", "refurbished"];
// available -> reserved (an order is pending) -> sold (order completed).
// A cancelled order puts the item back to "available".
export const ITEM_STATUSES = ["available", "reserved", "sold"];

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: { type: String, required: true, lowercase: true, trim: true }, // e.g. "clothing"
    condition: { type: String, enum: ITEM_CONDITIONS, default: "used" },
    status: { type: String, enum: ITEM_STATUSES, default: "available" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

itemSchema.index({ seller: 1 });
itemSchema.index({ status: 1, category: 1, createdAt: -1 });

export const Item = mongoose.model("Item", itemSchema);
