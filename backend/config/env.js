// Reads .env once and exposes a single validated `config` object to the rest of the app.
import dotenv from "dotenv";

dotenv.config();

const env = process.env;
const isProd = env.NODE_ENV === "production";

// Turns "a, b ,c" into ["a", "b", "c"], or returns the fallback when the var is unset.
const list = (value, fallback = []) =>
  value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;

const stripSlash = (url) => url.replace(/\/+$/, "");

// Fail fast at startup instead of crashing on the first request.
const missing = ["MONGO_URI", "JWT_SECRET"].filter((k) => !env[k]);
if (missing.length) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. See backend/.env.example`
  );
}
if (isProd && env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}

const clientOrigins = list(env.CLIENT_ORIGIN, ["http://localhost:5173", "http://localhost:5174"]).map(
  stripSlash
);

export const config = {
  isProd,
  isTest: env.NODE_ENV === "test",
  port: Number(env.PORT) || 8000,
  mongoUri: env.MONGO_URI,
  jwtSecret: env.JWT_SECRET,
  // Key used to encrypt OTPs at rest so only the buyer can read them back.
  otpEncryptionSecret: env.OTP_ENCRYPTION_KEY || env.JWT_SECRET,
  trustProxy: env.TRUST_PROXY === "true",
  clientOrigins,
  // Options for the login cookie (also reused when clearing it on logout).
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: env.COOKIE_SAMESITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  },
  cas: {
    url: stripSlash(env.CAS_URL || "https://login.iiit.ac.in/cas"),
    // CAS "service" URLs the frontend is allowed to use for ticket validation.
    allowedServices: list(
      env.CAS_ALLOWED_SERVICES,
      clientOrigins.map((o) => `${o}/cas-callback`)
    ),
  },
  allowedEmailDomains: list(env.ALLOWED_EMAIL_DOMAINS, [
    "iiit.ac.in",
    "students.iiit.ac.in",
    "research.iiit.ac.in",
  ]).map((d) => d.toLowerCase()),
  // Wrong-OTP policy: this many misses locks the order for lockMs.
  otp: {
    maxAttempts: 5,
    lockMs: 15 * 60 * 1000,
  },
  // Emails with admin rights. Only counts for CAS-verified accounts (see utils/roles.js).
  adminEmails: list(env.ADMIN_EMAILS).map((e) => e.toLowerCase()),
  // A pending order that isn't completed within this many days is cancelled automatically.
  reservationDays: Number(env.RESERVATION_DAYS) || 7,
};
