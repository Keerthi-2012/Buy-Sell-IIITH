import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  category: { type: String, required: true }, // e.g., "clothing", "grocery"
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true  // adds createdAt and updatedAt automatically
});

export const Item = mongoose.model("Item", itemSchema);
