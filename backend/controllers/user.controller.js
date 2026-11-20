import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { parseStringPromise } from "xml2js";
import { User } from "../models/user.model.js";
import { config } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { isAdminUser, isProfileComplete } from "../utils/roles.js";

// The only user fields the client ever sees (plus two derived flags the UI needs).
const publicUser = (u) => ({
  _id: u._id.toString(),
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  age: u.age,
  contactNumber: u.contactNumber,
  isAdmin: isAdminUser(u),
  profileComplete: isProfileComplete(u),
});

// Signs a 7-day JWT and sends it as an httpOnly cookie (JavaScript can't read it).
const setAuthCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
  res.cookie("token", token, config.cookie);
};

// Real hash used to burn the same time on unknown emails (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const emailDomainAllowed = (email) =>
  config.allowedEmailDomains.includes(email.split("@")[1]);

// ========== REGISTER ==========
export const register = async (req, res) => {
  const { firstName, lastName, email, age, contactNumber, password } = req.valid.body;

  if (!emailDomainAllowed(email)) {
    throw new AppError(
      400,
      `Only ${config.allowedEmailDomains.map((d) => "@" + d).join(", ")} emails can register.`
    );
  }
  if (await User.exists({ email })) {
    throw new AppError(409, "User with this email already exists");
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    age,
    contactNumber,
    passwordHash: await bcrypt.hash(password, 10),
  });

  // New users are logged in straight away.
  setAuthCookie(res, user._id);
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: publicUser(user),
  });
};

// ========== LOGIN ==========
export const login = async (req, res) => {
  const { email, password } = req.valid.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  // CAS accounts have no password; always compare so timing doesn't leak which case it was.
  const hash = user?.authProvider === "local" ? user.passwordHash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  // Same message for every failure so attackers can't tell which emails exist.
  if (!user || user.authProvider !== "local" || !ok) {
    throw new AppError(401, "Invalid email or password.");
  }

  setAuthCookie(res, user._id);
  res.json({ success: true, message: "Login successful", user: publicUser(user) });
};

// ========== LOGOUT ==========
export const logout = (_req, res) => {
  // The cookie must be cleared with the same options it was set with.
  const { maxAge, ...opts } = config.cookie;
  res.clearCookie("token", opts);
  res.json({ message: "Logged out successfully." });
};

// ========== PROFILE ==========
export const getProfile = (req, res) => {
  res.json({ user: publicUser(req.user) });
};

export const updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, req.valid.body, {
    new: true,
    runValidators: true,
  });
  res.json({ message: "Profile updated successfully.", user: publicUser(user) });
};

// ========== CAS LOGIN ==========
const capitalize = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

// Asks the IIIT CAS server whether a ticket is genuine and returns the username it belongs to.
const validateCasTicket = async (ticket, service) => {
  const url = new URL(`${config.cas.url}/serviceValidate`);
  url.searchParams.set("ticket", ticket);
  url.searchParams.set("service", service);

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new AppError(502, "CAS server error");

  // CAS answers in XML; success carries <cas:user>.
  const parsed = await parseStringPromise(await response.text());
  const success = parsed["cas:serviceResponse"]?.["cas:authenticationSuccess"];
  if (!success) throw new AppError(401, "CAS validation failed");
  return String(success[0]["cas:user"][0]).trim().toLowerCase();
};

export const casLogin = async (req, res) => {
  const { ticket, service } = req.query;
  if (typeof ticket !== "string" || typeof service !== "string" || !ticket || !service) {
    throw new AppError(400, "Missing CAS ticket or service URL.");
  }
  // The service must be one of ours; otherwise this endpoint validates tickets for any site.
  if (!config.cas.allowedServices.includes(service)) {
    throw new AppError(400, "Unrecognised CAS service URL.");
  }

  const username = await validateCasTicket(ticket, service);
  // CAS may return a bare roll number or a full email; normalise to an email.
  const email = username.includes("@") ? username : `${username}@iiit.ac.in`;

  let user = await User.findOne({ email });
  if (!user) {
    // First CAS login: create the account, guessing a name from "first.last@..." if possible.
    const [first, last = ""] = email.split("@")[0].split(".");
    user = await User.create({
      firstName: username.includes("@") ? capitalize(first) : username,
      lastName: username.includes("@") ? capitalize(last) : "",
      email,
      authProvider: "cas",
    });
  } else if (user.authProvider !== "cas") {
    // Registration doesn't verify email ownership, so CAS (which does) takes over any pre-registered account.
    user.authProvider = "cas";
    user.passwordHash = undefined;
    await user.save();
  }

  setAuthCookie(res, user._id);
  res.json({ success: true, message: "CAS login successful", user: publicUser(user) });
};
