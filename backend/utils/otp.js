// Helpers for the delivery OTP: generate it, hash it for checking, encrypt it for display.
import crypto from "crypto";
import bcrypt from "bcrypt";
import { config } from "../config/env.js";

// 32-byte AES key derived from the configured secret.
const key = crypto
  .createHash("sha256")
  .update(`otp:${config.otpEncryptionSecret}`)
  .digest();

// Random 6-digit code (randomInt is cryptographically secure, unlike Math.random).
export const generateOtp = () => String(crypto.randomInt(100000, 1000000));

export const hashOtp = (otp) => bcrypt.hash(otp, 10);

export const verifyOtp = (otp, hash) => bcrypt.compare(String(otp), hash);

// AES-256-GCM so the buyer can see their OTP again without it sitting in the DB as plaintext.
export const encryptOtp = (otp) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(otp, "utf8"), cipher.final()]);
  // Stored as "iv.authTag.ciphertext", each part base64url-encoded.
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
};

// Returns the plaintext OTP, or null if the value is missing or has been tampered with.
export const decryptOtp = (payload) => {
  if (!payload) return null;
  try {
    const [iv, tag, ct] = payload.split(".").map((s) => Buffer.from(s, "base64url"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};
