import { z } from "zod";
import { ITEM_CONDITIONS } from "../models/item.model.js";

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
export const idParam = z.object({ id: objectId });
export const transactionParam = z.object({ transactionId: z.string().min(1).max(64) });

// Treat "" (e.g. an empty form field in a query string) as "not provided".
const optional = (schema) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const email = z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address."));
const name = z.string().trim().min(1, "Name is required").max(50);
const age = z.coerce.number().int("Age must be a whole number").min(1).max(120, "Please enter a valid age");
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
const category = z
  .string()
  .trim()
  .min(1, "Category is required")
  .max(40)
  .transform((s) => s.toLowerCase().replace(/\s+/g, "_"));
const itemName = z.string().trim().min(1, "Item name is required").max(100);
const price = z.coerce.number("Price must be a number").min(0, "Price cannot be negative").max(10_000_000);
const description = z.string().trim().max(2000).optional();
const condition = z.enum(ITEM_CONDITIONS);

export const createItemBody = z.object({
  name: itemName,
  price,
  description,
  category,
  condition: condition.default("used"),
});

export const updateItemBody = z
  .object({
    name: itemName.optional(),
    price: price.optional(),
    description,
    category: category.optional(),
    condition: condition.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

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
export const createOrderBody = z.object({ item: objectId });
export const checkoutBody = z.object({ items: z.array(objectId).min(1).max(50).optional() });
export const completeOrderBody = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});
