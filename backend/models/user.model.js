import mongoose from "mongoose";

const isLocal = function () {
  return this.authProvider === "local";
};

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: "", trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // CAS users have no age/contact until they fill in their profile.
    age: { type: Number, min: 0, max: 120, required: isLocal, default: 0 },
    contactNumber: { type: String, default: "" },
    // "cas" accounts never have a password and can't use password login.
    authProvider: { type: String, enum: ["local", "cas"], default: "local" },
    passwordHash: { type: String, required: isLocal, select: false },
    sellerReviews: [
      {
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
