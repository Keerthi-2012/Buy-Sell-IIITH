import mongoose from "mongoose";

// Used for fields that only password-based accounts need.
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
    // select: false keeps the hash out of every query unless explicitly requested.
    passwordHash: { type: String, required: isLocal, select: false },
  },
  { timestamps: true }
);

// Safety net: even if a hash slips into a document, it's removed when serialised to JSON.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
