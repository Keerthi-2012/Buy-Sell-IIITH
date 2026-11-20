import crypto from "crypto";
import bcrypt from "bcrypt";
import { config } from "../config/env.js";

const key = crypto
  .createHash("sha256")
  .update(`otp:${config.otpEncryptionSecret}`)
  .digest();

export const generateOtp = () => String(crypto.randomInt(100000, 1000000));

export const hashOtp = (otp) => bcrypt.hash(otp, 10);

export const verifyOtp = (otp, hash) => bcrypt.compare(String(otp), hash);

// AES-256-GCM: the buyer must be able to see their OTP again, but the
// database never holds it in plaintext.
export const encryptOtp = (otp) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(otp, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
};

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
