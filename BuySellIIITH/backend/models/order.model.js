import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  hashedOTP: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  otp: { type: String, select: true }, // DEV ONLY — not for prod
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true // adds createdAt and updatedAt automatically
});

export const Order = mongoose.model("Order", orderSchema);