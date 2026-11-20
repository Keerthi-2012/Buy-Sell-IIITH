import mongoose from "mongoose";

// One order = one item sold from one user to another, confirmed by an OTP at handover.
const orderSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    // Snapshot so order history survives the item being deleted.
    itemName: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 }, // total for all units
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },

    // Delivery OTP, hidden from queries by default; only the buyer ever sees the decrypted value.
    hashedOTP: { type: String, required: true, select: false }, // for checking guesses
    otpEncrypted: { type: String, required: true, select: false }, // so the buyer can view it
    otpAttempts: { type: Number, default: 0, select: false }, // wrong guesses so far
    otpLockedUntil: { type: Date, select: false }, // set after too many wrong guesses

    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // cancelled = a buyer/seller did it, expired = nobody finished it in time, removed = an admin deleted the listing
    cancelReason: { type: String, enum: ["cancelled", "expired", "removed"] },
    cancelledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

// Orders are always looked up by "my purchases" or "my sales", filtered by status.
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });

export const Order = mongoose.model("Order", orderSchema);
