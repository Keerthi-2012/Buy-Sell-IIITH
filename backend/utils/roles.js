// Small helpers for "what is this user allowed to do" questions.
import { config } from "../config/env.js";
import { AppError } from "./AppError.js";

// Admin = in ADMIN_EMAILS and signed in via CAS (password accounts never prove email ownership).
export const isAdminUser = (user) =>
  user.authProvider === "cas" && config.adminEmails.includes(user.email);

// Buying and selling both involve meeting in person, so we need an age and a phone number.
export const isProfileComplete = (user) => user.age > 0 && !!user.contactNumber;

export const assertProfileComplete = (user) => {
  if (!isProfileComplete(user)) {
    throw new AppError(
      403,
      "Add your age and contact number to your profile before buying or selling.",
      { code: "PROFILE_INCOMPLETE" }
    );
  }
};
