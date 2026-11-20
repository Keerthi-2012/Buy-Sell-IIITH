// Input rules for every endpoint; each schema validates and tidies values before controllers see them.
import { z } from "zod";
import { ITEM_CONDITIONS } from "../models/item.model.js";

// A 24-character hex string, i.e. a MongoDB ObjectId.
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
export const idParam = z.object({ id: objectId });
export const transactionParam = z.object({ transactionId: z.string().min(1).max(64) });

// Treat "" (e.g. an empty form field in a query string) as "not provided".
const optional = (schema) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

// Emails are lowercased so "A@x.com" and "a@x.com" are the same account.
const email = z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address."));
const name = z.string().trim().min(1, "Name is required").max(50);
const age = z.coerce.number().int("Age must be a whole number").min(1).max(120, "Please enter a valid age");
// Digits with optional +, spaces, dashes and brackets, 7 to 16 characters.
const contactNumber = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s\-()]{7,16}$/, "Please enter a valid contact number");

// ---------- user ----------
export const registerBody = z.object({
  firstName: name,
  lastName: name,
  email,
  age,
  contactNumber,
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
});

export const updateProfileBody = z.object({
  firstName: name,
  lastName: name,
  age,
  contactNumber,
});

// ---------- item ----------

// Categories are stored as snake_case, e.g. "Hostel Essentials" -> "hostel_essentials".
const category = z
  .string()
  .trim()
  .min(1, "Category is required")
  .max(40)
  .transform((s) => s.toLowerCase().replace(/\s+/g, "_"));
const itemName = z.string().trim().min(1, "Item name is required").max(100);
// A whole number of units, e.g. how many are for sale or how many to buy.
const units = (min, max) => z.coerce.number("Quantity must be a number").int("Quantity must be a whole number").min(min, `Quantity must be at least ${min}`).max(max, `Quantity can't be more than ${max}`);
const price = z.coerce.number("Price must be a number").min(0, "Price cannot be negative").max(10_000_000);
const description = z.string().trim().max(2000).optional();
const condition = z.enum(ITEM_CONDITIONS);

export const createItemBody = z.object({
  name: itemName,
  price,
  quantity: units(1, 1000).default(1),
  description,
  category,
  condition: condition.default("used"),
});

// Every field is optional on update, but at least one must be present.
export const updateItemBody = z
  .object({
    name: itemName.optional(),
    price: price.optional(),
    quantity: units(0, 1000).optional(),
    description,
    category: category.optional(),
    condition: condition.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

// Browse filters; page defaults to 1 and limit to 24 (max 100).
export const listItemsQuery = z.object({
  search: optional(z.string().trim().max(100)),
  category: optional(category),
  condition: optional(condition),
  minPrice: optional(z.coerce.number().min(0)),
  maxPrice: optional(z.coerce.number().min(0)),
  sort: optional(z.enum(["price_asc", "price_desc", "name_asc", "name_desc", "newest"])),
  page: optional(z.coerce.number().int().min(1)).default(1),
  limit: optional(z.coerce.number().int().min(1).max(100)).default(24),
});

// ---------- cart / orders ----------
export const cartItemBody = z.object({ itemId: objectId });
export const addToCartBody = z.object({ itemId: objectId, quantity: units(1, 1000).default(1) });
export const cartQuantityBody = z.object({ itemId: objectId, quantity: units(1, 1000) });
export const createOrderBody = z.object({ item: objectId, quantity: units(1, 1000).default(1) });
export const checkoutBody = z.object({ items: z.array(objectId).min(1).max(50).optional() });
// Star rating (1-5) with an optional short comment.
export const reviewBody = z.object({
  rating: z.coerce.number().int("Rating must be a whole number").min(1, "Pick 1 to 5 stars").max(5, "Pick 1 to 5 stars"),
  comment: z.string().trim().max(500, "Keep the comment under 500 characters").optional(),
});

// Admin tables: optional status filter plus paging.
export const adminListQuery = z.object({
  status: optional(z.enum(["available", "reserved", "sold", "pending", "completed", "cancelled"])),
  page: optional(z.coerce.number().int().min(1)).default(1),
  limit: optional(z.coerce.number().int().min(1).max(100)).default(25),
});

// The OTP the buyer reads out to the seller.
export const completeOrderBody = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});
