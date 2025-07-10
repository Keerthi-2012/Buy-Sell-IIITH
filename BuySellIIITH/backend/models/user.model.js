import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String,   required: false,default: ''  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  age: { type: Number, required: true },
  contactNumber: { type: String, reqired: false, default: '' },
  passwordHash: { type: String, required: true }, // bcrypt-hashed
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  sellerReviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);