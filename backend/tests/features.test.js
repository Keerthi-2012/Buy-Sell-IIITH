// Tests for reviews, my listings, admin tools, the profile gate and reservation expiry (env set before imports).
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://unused";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.ADMIN_EMAILS = "admin@iiit.ac.in";
process.env.RESERVATION_DAYS = "7";

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const { createApp } = await import("../app.js");
const { User } = await import("../models/user.model.js");
const { Item } = await import("../models/item.model.js");
const { Order } = await import("../models/order.model.js");
const { expireStaleOrders } = await import("../services/maintenance.js");

let mongod;
let app;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Item.init(), Order.init()]);
  app = createApp();
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

let n = 0;
// Registers a password user (profile complete) and returns an agent holding their cookie.
const signup = async () => {
  const agent = request.agent(app);
  const email = `user${++n}@students.iiit.ac.in`;
  const res = await agent.post("/api/v1/user/register").send({
    firstName: "Test",
    lastName: `User${n}`,
    email,
    age: 20,
    contactNumber: "9876543210",
    password: "password123",
  });
  return { agent, id: res.body.user._id };
};

// Creates a CAS user directly and returns an agent logged in as them (CAS itself can't be reached in tests).
const casUser = async (email, extra = {}) => {
  const user = await User.create({ firstName: "Cas", email, authProvider: "cas", ...extra });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { algorithm: "HS256" });
  const agent = request.agent(app);
  agent.set("Cookie", `token=${token}`);
  return { agent, id: user._id.toString() };
};

const listItem = async (agent, overrides = {}) =>
  (await agent.post("/api/v1/item").send({ name: "Desk lamp", price: 250, category: "misc", ...overrides })).body;

// Buyer orders the item; the seller then completes it with the OTP.
const buyAndComplete = async (seller, buyer, item) => {
  const { body } = await buyer.agent.post("/api/v1/order").send({ item: item._id });
  const tx = body.order.transactionId;
  await seller.agent.patch(`/api/v1/order/${tx}/complete`).send({ otp: body.otp });
  return tx;
};

// ---------------------------------------------------------------- profile gate
test("CAS users must complete their profile before selling or buying", async () => {
  const cas = await casUser("newcomer@iiit.ac.in");
  const seller = await signup();
  const item = await listItem(seller.agent);

  const profile = await cas.agent.get("/api/v1/user/profile");
  assert.equal(profile.body.user.profileComplete, false);
  assert.equal(profile.body.user.authProvider, "cas");

  const sell = await cas.agent.post("/api/v1/item").send({ name: "Book", price: 100, category: "books" });
  assert.equal(sell.status, 403);
  assert.equal(sell.body.code, "PROFILE_INCOMPLETE");
  assert.equal((await cas.agent.post("/api/v1/order").send({ item: item._id })).status, 403);
  assert.equal((await cas.agent.post("/api/v1/order/checkout").send({})).status, 403);

  const update = await cas.agent
    .put("/api/v1/user/update")
    .send({ firstName: "Cas", lastName: "User", age: 21, contactNumber: "9123456780" });
  assert.equal(update.body.user.profileComplete, true);
  assert.equal((await cas.agent.post("/api/v1/item").send({ name: "Book", price: 100, category: "books" })).status, 201);
});

test("a CAS user with no surname can still complete their profile", async () => {
  const cas = await casUser("rollno123@iiit.ac.in");
  const update = await cas.agent
    .put("/api/v1/user/update")
    .send({ firstName: "Rollno123", lastName: "", age: 20, contactNumber: "9123456780" });
  assert.equal(update.status, 200);
  assert.equal(update.body.user.profileComplete, true);

  // registration itself still asks for a last name
  const reg = await request(app).post("/api/v1/user/register").send({
    firstName: "No",
    lastName: "",
    email: "nolast@students.iiit.ac.in",
    age: 20,
    contactNumber: "9876543210",
    password: "password123",
  });
  assert.equal(reg.status, 400);
});

// ---------------------------------------------------------------- reviews
test("reviews: only the buyer, only after completion; rating again updates it", async () => {
  const seller = await signup();
  const buyer = await signup();
  const stranger = await signup();
  const item = await listItem(seller.agent);
  const { body } = await buyer.agent.post("/api/v1/order").send({ item: item._id });
  const tx = body.order.transactionId;
  const review = (a, payload) => a.post(`/api/v1/order/${tx}/review`).send(payload);

  // too early: the order is still pending
  assert.equal((await review(buyer.agent, { rating: 5 })).status, 409);

  await seller.agent.patch(`/api/v1/order/${tx}/complete`).send({ otp: body.otp });

  assert.equal((await review(seller.agent, { rating: 5 })).status, 403);
  assert.equal((await review(stranger.agent, { rating: 5 })).status, 403);
  assert.equal((await review(buyer.agent, { rating: 6 })).status, 400);
  assert.equal((await review(buyer.agent, { rating: 0 })).status, 400);
  assert.equal((await review(buyer.agent, { rating: 4, comment: "x".repeat(501) })).status, 400);

  assert.equal((await review(buyer.agent, { rating: 4, comment: "Smooth handover" })).status, 201);

  // the buyer's order list now carries their rating, so the UI can show it
  let placed = await buyer.agent.get("/api/v1/order/placed");
  assert.deepEqual(placed.body[0].myReview, { rating: 4, comment: "Smooth handover" });

  // rating again changes it (200) instead of adding a second review
  const again = await review(buyer.agent, { rating: 2, comment: "On reflection, slow" });
  assert.equal(again.status, 200);
  placed = await buyer.agent.get("/api/v1/order/placed");
  assert.deepEqual(placed.body[0].myReview, { rating: 2, comment: "On reflection, slow" });
  assert.deepEqual((await request(app).get(`/api/v1/review/seller/${seller.id}`)).body.summary, { average: 2, count: 1 });
});

test("one buyer with several orders from the same seller counts as ONE rating", async () => {
  const seller = await signup();
  const buyer = await signup();
  const other = await signup();
  const [a, b, c] = await Promise.all([
    listItem(seller.agent, { name: "Notebook" }),
    listItem(seller.agent, { name: "Pen set" }),
    listItem(seller.agent, { name: "Backpack" }),
  ]);
  const txs = [];
  for (const item of [a, b, c]) txs.push(await buyAndComplete(seller, buyer, item));

  // the buyer rates the same seller on every one of their three orders
  const ratings = [5, 3, 1];
  for (const [i, tx] of txs.entries()) {
    const res = await buyer.agent.post(`/api/v1/order/${tx}/review`).send({ rating: ratings[i], comment: `order ${i + 1}` });
    assert.equal(res.status, i === 0 ? 201 : 200);
  }

  let summary = (await request(app).get(`/api/v1/review/seller/${seller.id}`)).body;
  assert.deepEqual(summary.summary, { average: 1, count: 1 }, "one buyer is one rating, the latest one");
  assert.equal(summary.reviews.length, 1);
  assert.equal(summary.reviews[0].comment, "order 3");

  // every one of that buyer's orders shows the same single rating
  const placed = await buyer.agent.get("/api/v1/order/placed");
  assert.ok(placed.body.every((o) => o.myReview?.rating === 1));

  // a different buyer is a second rating, and the average is across buyers
  const otherTx = await buyAndComplete(seller, other, await listItem(seller.agent, { name: "Mug" }));
  await other.agent.post(`/api/v1/order/${otherTx}/review`).send({ rating: 5 });
  summary = (await request(app).get(`/api/v1/review/seller/${seller.id}`)).body;
  assert.deepEqual(summary.summary, { average: 3, count: 2 });
  assert.equal(summary.reviews.length, 2);
});

test("duplicate reviews already in the database (from before this rule) count once, latest wins", async () => {
  const seller = await signup();
  const buyer = await signup();
  const [a, b] = await Promise.all([listItem(seller.agent, { name: "A" }), listItem(seller.agent, { name: "B" })]);
  const txA = await buyAndComplete(seller, buyer, a);
  const txB = await buyAndComplete(seller, buyer, b);
  const orderA = await Order.findOne({ transactionId: txA });
  const orderB = await Order.findOne({ transactionId: txB });

  // the old behaviour: one review per order, written straight into the collection
  const { Review } = await import("../models/review.model.js");
  const now = Date.now();
  await Review.collection.insertMany([
    { order: orderA._id, reviewer: orderA.buyer, seller: orderA.seller, rating: 2, comment: "", createdAt: new Date(now - 5000), updatedAt: new Date(now - 5000) },
    { order: orderB._id, reviewer: orderB.buyer, seller: orderB.seller, rating: 1, comment: "", createdAt: new Date(now), updatedAt: new Date(now) },
  ]);

  const res = (await request(app).get(`/api/v1/review/seller/${seller.id}`)).body;
  assert.deepEqual(res.summary, { average: 1, count: 1 });
  assert.equal(res.reviews.length, 1);

  // and a new rating updates the newest of them instead of making a third
  const update = await buyer.agent.post(`/api/v1/order/${txA}/review`).send({ rating: 4 });
  assert.equal(update.status, 200);
  assert.deepEqual((await request(app).get(`/api/v1/review/seller/${seller.id}`)).body.summary, { average: 4, count: 1 });
});

test("seller rating shows on the item page and in the public reviews list", async () => {
  const seller = await signup();
  const b1 = await signup();
  const b2 = await signup();
  const i1 = await listItem(seller.agent, { name: "One" });
  const i2 = await listItem(seller.agent, { name: "Two" });
  const t1 = await buyAndComplete(seller, b1, i1);
  const t2 = await buyAndComplete(seller, b2, i2);
  await b1.agent.post(`/api/v1/order/${t1}/review`).send({ rating: 5, comment: "Great" });
  await b2.agent.post(`/api/v1/order/${t2}/review`).send({ rating: 4 });

  const item = await request(app).get(`/api/v1/item/${i1._id}`);
  assert.deepEqual(item.body.sellerRating, { average: 4.5, count: 2 });

  const list = await request(app).get(`/api/v1/review/seller/${seller.id}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.summary.count, 2);
  assert.equal(list.body.reviews.length, 2);
  assert.ok(list.body.reviews[0].reviewer.firstName);
  assert.ok(!JSON.stringify(list.body).includes("email"), "reviewer emails must not be public");

  const none = await request(app).get(`/api/v1/review/seller/${b1.id}`);
  assert.deepEqual(none.body.summary, { average: null, count: 0 });
});

// ---------------------------------------------------------------- my listings
test("my listings: every status, own items only, login required", async () => {
  const seller = await signup();
  const buyer = await signup();
  await listItem(seller.agent, { name: "Available" });
  const r = await listItem(seller.agent, { name: "Reserved" });
  const s = await listItem(seller.agent, { name: "Sold" });
  await buyer.agent.post("/api/v1/order").send({ item: r._id });
  await buyAndComplete(seller, buyer, s);

  const mine = await seller.agent.get("/api/v1/item/mine");
  assert.equal(mine.status, 200);
  const byName = Object.fromEntries(mine.body.map((i) => [i.name, i.status]));
  assert.deepEqual(byName, { Available: "available", Reserved: "reserved", Sold: "sold" });

  assert.equal((await buyer.agent.get("/api/v1/item/mine")).body.length, 0);
  assert.equal((await request(app).get("/api/v1/item/mine")).status, 401);
});

// ---------------------------------------------------------------- admin
test("admin: only CAS-verified admin emails get in, and a password account can't fake it", async () => {
  const normal = await signup();
  assert.equal((await normal.agent.get("/api/v1/admin/orders")).status, 403);
  assert.equal((await request(app).get("/api/v1/admin/orders")).status, 401);

  // someone registers the admin's email with a password: still not an admin
  const fake = request.agent(app);
  const reg = await fake.post("/api/v1/user/register").send({
    firstName: "Fake",
    lastName: "Admin",
    email: "admin@iiit.ac.in",
    age: 20,
    contactNumber: "9876543210",
    password: "password123",
  });
  assert.equal(reg.body.user.isAdmin, false);
  assert.equal((await fake.get("/api/v1/admin/items")).status, 403);
});

test("admin can list everything and remove a listing; its pending order is cancelled", async () => {
  // Take over the password-registered admin record the way a real CAS login would, then sign in as them.
  const user = await User.findOne({ email: "admin@iiit.ac.in" });
  user.authProvider = "cas";
  user.passwordHash = undefined;
  await user.save();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { algorithm: "HS256" });
  const adminAgent = request.agent(app).set("Cookie", `token=${token}`);

  const profile = await adminAgent.get("/api/v1/user/profile");
  assert.equal(profile.body.user.isAdmin, true);

  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { name: "Shady listing" });
  const placed = await buyer.agent.post("/api/v1/order").send({ item: item._id });

  const orders = await adminAgent.get("/api/v1/admin/orders").query({ status: "pending" });
  assert.equal(orders.status, 200);
  assert.ok(orders.body.orders.some((o) => o.transactionId === placed.body.order.transactionId));
  assert.ok(!JSON.stringify(orders.body).includes("otp"), "admin views must never show OTPs");

  const items = await adminAgent.get("/api/v1/admin/items").query({ status: "reserved" });
  assert.ok(items.body.items.some((i) => i._id === item._id));

  assert.equal((await seller.agent.delete(`/api/v1/admin/items/${item._id}`)).status, 403);
  assert.equal((await adminAgent.delete(`/api/v1/admin/items/${item._id}`)).status, 200);

  assert.equal(await Item.findById(item._id), null);
  const order = await Order.findOne({ transactionId: placed.body.order.transactionId });
  assert.equal(order.status, "cancelled");
  assert.equal(order.cancelReason, "removed");
  assert.equal((await adminAgent.delete(`/api/v1/admin/items/${item._id}`)).status, 404);
});

// ---------------------------------------------------------------- reservation expiry
test("stale reservations are released automatically; fresh ones are left alone", async () => {
  const seller = await signup();
  const buyer = await signup();
  const old = await listItem(seller.agent, { name: "Old reservation" });
  const fresh = await listItem(seller.agent, { name: "Fresh reservation" });
  const oldOrder = await buyer.agent.post("/api/v1/order").send({ item: old._id });
  const freshOrder = await buyer.agent.post("/api/v1/order").send({ item: fresh._id });

  // the buyer sees when it will be released
  const placed = await buyer.agent.get("/api/v1/order/placed");
  assert.ok(placed.body.every((o) => o.expiresAt), "pending orders must carry an expiry date");

  // backdate one order past the 7-day limit
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await Order.collection.updateOne(
    { transactionId: oldOrder.body.order.transactionId },
    { $set: { createdAt: eightDaysAgo } }
  );

  assert.equal(await expireStaleOrders(), 1);

  const expired = await Order.findOne({ transactionId: oldOrder.body.order.transactionId });
  assert.equal(expired.status, "cancelled");
  assert.equal(expired.cancelReason, "expired");
  assert.equal((await Item.findById(old._id)).status, "available");

  const kept = await Order.findOne({ transactionId: freshOrder.body.order.transactionId });
  assert.equal(kept.status, "pending");
  assert.equal((await Item.findById(fresh._id)).status, "reserved");

  // running it again finds nothing new, and the freed item can be bought again
  assert.equal(await expireStaleOrders(), 0);
  const other = await signup();
  assert.equal((await other.agent.post("/api/v1/order").send({ item: old._id })).status, 201);
});
