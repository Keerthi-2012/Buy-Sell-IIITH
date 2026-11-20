import dotenv from "dotenv";

dotenv.config();

const env = process.env;
const isProd = env.NODE_ENV === "production";

const list = (value, fallback = []) =>
  value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;

const stripSlash = (url) => url.replace(/\/+$/, "");

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
  otp: {
    maxAttempts: 5,
    lockMs: 15 * 60 * 1000,
  },
};
