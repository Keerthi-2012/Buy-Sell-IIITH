import mongoose from "mongoose";

// Every listing is a single second-hand unit, so a cart simply holds a set
// of items (quantity is always 1).
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: [
    {
      _id: false,
      item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
      quantity: { type: Number, default: 1, min: 1, max: 1 },
    },
  ],
});

export const Cart = mongoose.model("Cart", cartSchema);
