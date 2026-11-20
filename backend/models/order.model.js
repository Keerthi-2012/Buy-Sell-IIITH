import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    // Snapshot so order history survives the item being deleted.
    itemName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },

    // Delivery OTP. Never selected by default; only the buyer gets the
    // decrypted value, via the order service.
    hashedOTP: { type: String, required: true, select: false },
    otpEncrypted: { type: String, required: true, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpLockedUntil: { type: Date, select: false },

    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });

export const Order = mongoose.model("Order", orderSchema);
