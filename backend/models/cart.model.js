import mongoose from "mongoose";

// A cart holds items with how many of each the user wants.
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true }, // one cart per user
  items: [
    {
      _id: false,
      item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
      quantity: { type: Number, default: 1, min: 1 },
    },
  ],
});

export const Cart = mongoose.model("Cart", cartSchema);
