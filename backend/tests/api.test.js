// End-to-end API tests against an in-memory MongoDB; env is set first because config reads it on import.
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://unused";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const { createApp } = await import("../app.js");
const { User } = await import("../models/user.model.js");
const { Item } = await import("../models/item.model.js");
const { Order } = await import("../models/order.model.js");

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
// Registers a fresh user and returns a supertest agent that keeps their login cookie.
const signup = async (overrides = {}) => {
  const agent = request.agent(app);
  const email = overrides.email ?? `user${++n}@students.iiit.ac.in`;
  const res = await agent.post("/api/v1/user/register").send({
    firstName: "Test",
    lastName: `User${n}`,
    email,
    age: 20,
    contactNumber: "9876543210",
    password: "password123",
    ...overrides,
  });
  return { agent, res, email, id: res.body.user?._id };
};

// Lists an item as the given user and returns it.
const listItem = async (agent, overrides = {}) =>
  (
    await agent.post("/api/v1/item").send({
      name: "Desk lamp",
      price: 250,
      category: "Hostel Essentials",
      description: "works fine",
      ...overrides,
    })
  ).body;

// Fails the test if a response contains anything that should stay server-side.
const noSecrets = (body) => {
  const s = JSON.stringify(body);
  for (const k of ["passwordHash", "hashedOTP", "otpEncrypted"]) {
    assert.ok(!s.includes(k), `response leaked ${k}`);
  }
};

// ---------------------------------------------------------------- auth
test("register: rejects non-IIIT emails, weak passwords; accepts valid", async () => {
  const bad = await signup({ email: "someone@gmail.com" });
  assert.equal(bad.res.status, 400);
  const weak = await signup({ password: "short" });
  assert.equal(weak.res.status, 400);
  const ok = await signup();
  assert.equal(ok.res.status, 201);
  assert.ok(ok.res.headers["set-cookie"]?.some((c) => c.startsWith("token=")));
  assert.ok(!("token" in ok.res.body), "token must not be in the body");
  noSecrets(ok.res.body);
  const dup = await signup({ email: ok.email });
  assert.equal(dup.res.status, 409);
});

test("login works with cookie; wrong password 401; profile requires auth", async () => {
  const { email } = await signup();
  const agent = request.agent(app);
  assert.equal((await agent.post("/api/v1/user/login").send({ email, password: "nope1234" })).status, 401);
  const ok = await agent.post("/api/v1/user/login").send({ email: email.toUpperCase(), password: "password123" });
  assert.equal(ok.status, 200);
  const profile = await agent.get("/api/v1/user/profile");
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.authProvider, "local");
  assert.equal((await request(app).get("/api/v1/user/profile")).status, 401);
});

test("CAS accounts cannot log in with a password (incl. the old 'casuser' one)", async () => {
  await User.create({ firstName: "cas1", email: "cas1@iiit.ac.in", authProvider: "cas" });
  for (const password of ["casuser", "", "anything1"]) {
    const res = await request(app).post("/api/v1/user/login").send({ email: "cas1@iiit.ac.in", password: password || "x" });
    assert.equal(res.status, 401);
  }
});

test("CAS login refuses unknown service URLs", async () => {
  const res = await request(app).get("/api/v1/user/cas-login").query({ ticket: "ST-1", service: "https://evil.example/cb" });
  assert.equal(res.status, 400);
});

test("every order and cart route requires auth", async () => {
  for (const [m, p] of [
    ["post", "/api/v1/order"],
    ["post", "/api/v1/order/checkout"],
    ["get", "/api/v1/order/placed"],
    ["get", "/api/v1/order/sold"],
    ["get", "/api/v1/order/cancelled"],
    ["patch", "/api/v1/order/abc/complete"],
    ["patch", "/api/v1/order/abc/cancel"],
    ["get", "/api/v1/cart"],
    ["post", "/api/v1/cart/add"],
  ]) {
    assert.equal((await request(app)[m](p)).status, 401, `${m} ${p}`);
  }
  // the old unauthenticated endpoints are gone
  assert.equal((await request(app).get("/api/v1/order")).status, 401);
});

// ---------------------------------------------------------------- items
test("items: mass-assignment, ownership and regex input are handled", async () => {
  const seller = await signup();
  const other = await signup();
  const item = await listItem(seller.agent);
  assert.equal(item.category, "hostel_essentials");
  assert.equal(item.status, "available");

  const hijack = await seller.agent
    .put(`/api/v1/item/${item._id}`)
    .send({ price: 300, seller: other.id, status: "sold" });
  assert.equal(hijack.status, 200);
  assert.equal(hijack.body.price, 300);
  assert.equal(hijack.body.seller, seller.id);
  assert.equal(hijack.body.status, "available");

  assert.equal((await other.agent.put(`/api/v1/item/${item._id}`).send({ price: 1 })).status, 403);
  assert.equal((await other.agent.delete(`/api/v1/item/${item._id}`)).status, 403);

  const evil = await request(app).get("/api/v1/item").query({ search: "(a+)+$[" });
  assert.equal(evil.status, 200);

  const list = await request(app).get("/api/v1/item").query({ search: "lamp", minPrice: "", limit: 5 });
  assert.equal(list.status, 200);
  assert.ok(list.body.items.length >= 1);
  const s = JSON.stringify(list.body);
  assert.ok(!s.includes("email"), "public listing must not expose seller email");
  noSecrets(list.body);
});

// ---------------------------------------------------------------- orders
test("buy now: price/seller come from the server; OTP only visible to buyer", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { price: 500 });

  // client-supplied amount/seller/buyer are ignored
  const res = await buyer.agent
    .post("/api/v1/order")
    .send({ item: item._id, amount: 1, seller: buyer.id, buyer: seller.id });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.amount, 500);
  assert.equal(res.body.order.buyer, buyer.id);
  assert.equal(res.body.order.seller, seller.id);
  assert.match(res.body.otp, /^\d{6}$/);

  const placed = await buyer.agent.get("/api/v1/order/placed");
  assert.equal(placed.body[0].otp, res.body.otp);
  noSecrets(placed.body);
  assert.equal(placed.body[0].seller.passwordHash, undefined);

  const sold = await seller.agent.get("/api/v1/order/sold");
  assert.equal(sold.body.length, 1);
  assert.equal(sold.body[0].otp, undefined, "seller must not see the OTP");
  noSecrets(sold.body);

  // the plaintext OTP is not stored anywhere in the DB
  const raw = await Order.collection.findOne({ transactionId: res.body.order.transactionId });
  assert.ok(!JSON.stringify(raw).includes(res.body.otp));
  assert.equal(raw.otp, undefined);
});

test("cannot buy own item; item cannot be bought twice", async () => {
  const seller = await signup();
  const b1 = await signup();
  const b2 = await signup();
  const item = await listItem(seller.agent);

  assert.equal((await seller.agent.post("/api/v1/order").send({ item: item._id })).status, 400);
  assert.equal((await b1.agent.post("/api/v1/order").send({ item: item._id })).status, 201);
  assert.equal((await b2.agent.post("/api/v1/order").send({ item: item._id })).status, 409);

  // concurrent race: exactly one wins
  const item2 = await listItem(seller.agent, { name: "Chair" });
  const results = await Promise.all([b1, b2].map((b) => b.agent.post("/api/v1/order").send({ item: item2._id })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await Order.countDocuments({ item: item2._id }), 1);
});

test("complete: only the seller, only with the right OTP, only once", async () => {
  const seller = await signup();
  const buyer = await signup();
  const stranger = await signup();
  const item = await listItem(seller.agent);
  const { body } = await buyer.agent.post("/api/v1/order").send({ item: item._id });
  const tx = body.order.transactionId;
  const complete = (a, otp) => a.patch(`/api/v1/order/${tx}/complete`).send({ otp });

  assert.equal((await complete(buyer.agent, body.otp)).status, 403);
  assert.equal((await complete(stranger.agent, body.otp)).status, 403);
  assert.equal((await complete(seller.agent, "abc")).status, 400);
  const wrong = body.otp === "123456" ? "654321" : "123456";
  assert.equal((await complete(seller.agent, wrong)).status, 400);

  const ok = await complete(seller.agent, body.otp);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.status, "completed");
  noSecrets(ok.body);
  assert.equal((await Item.findById(item._id)).status, "sold");
  assert.equal((await complete(seller.agent, body.otp)).status, 409);
  assert.equal((await buyer.agent.patch(`/api/v1/order/${tx}/cancel`)).status, 400);
  // sold items are not publicly listed
  const pub = await request(app).get("/api/v1/item").query({ search: "Desk" });
  assert.ok(!pub.body.items.some((i) => i._id === item._id));
});

test("OTP brute force is locked out after 5 wrong tries", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent);
  const { body } = await buyer.agent.post("/api/v1/order").send({ item: item._id });
  const tx = body.order.transactionId;
  const wrong = body.otp === "111111" ? "222222" : "111111";

  for (let i = 0; i < 5; i++) {
    assert.equal((await seller.agent.patch(`/api/v1/order/${tx}/complete`).send({ otp: wrong })).status, 400);
  }
  // even the correct OTP is refused while locked
  const locked = await seller.agent.patch(`/api/v1/order/${tx}/complete`).send({ otp: body.otp });
  assert.equal(locked.status, 429);
  assert.equal((await Order.findOne({ transactionId: tx })).status, "pending");
});

test("cancel (buyer or seller) puts the item back on sale", async () => {
  const seller = await signup();
  const buyer = await signup();
  const stranger = await signup();
  const item = await listItem(seller.agent);
  const a = await buyer.agent.post("/api/v1/order").send({ item: item._id });
  assert.equal((await Item.findById(item._id)).status, "reserved");
  // buyers are waiting, so the listing can't be deleted until the order is settled
  assert.equal((await seller.agent.delete(`/api/v1/item/${item._id}`)).status, 409);

  const tx = a.body.order.transactionId;
  assert.equal((await stranger.agent.patch(`/api/v1/order/${tx}/cancel`)).status, 403);
  const c = await seller.agent.patch(`/api/v1/order/${tx}/cancel`);
  assert.equal(c.status, 200);
  assert.equal(c.body.status, "cancelled");
  assert.ok(c.body.cancelledAt);
  assert.equal((await Item.findById(item._id)).status, "available");
  assert.equal((await buyer.agent.get("/api/v1/order/cancelled")).body.length, 1);
  assert.equal((await stranger.agent.post("/api/v1/order").send({ item: item._id })).status, 201);
});

test("cart + checkout: one order per item, cart cleared, all-or-nothing", async () => {
  const seller = await signup();
  const buyer = await signup();
  const rival = await signup();
  const i1 = await listItem(seller.agent, { name: "Book A" });
  const i2 = await listItem(seller.agent, { name: "Book B" });

  assert.equal((await seller.agent.post("/api/v1/cart/add").send({ itemId: i1._id })).status, 400);
  await buyer.agent.post("/api/v1/cart/add").send({ itemId: i1._id });
  // only one unit exists, so a second add is refused and the cart keeps a single entry
  assert.equal((await buyer.agent.post("/api/v1/cart/add").send({ itemId: i1._id })).status, 409);
  await buyer.agent.post("/api/v1/cart/add").send({ itemId: i2._id });
  assert.equal((await buyer.agent.get("/api/v1/cart")).body.items.length, 2);

  // rival grabs Book B first: checkout must fail and leave Book A untouched
  await rival.agent.post("/api/v1/order").send({ item: i2._id });
  const fail = await buyer.agent.post("/api/v1/order/checkout").send({});
  assert.equal(fail.status, 409);
  assert.equal((await Item.findById(i1._id)).status, "available");
  assert.equal(await Order.countDocuments({ buyer: buyer.id }), 0);

  // the cart prunes items that are no longer on sale
  const cart = await buyer.agent.get("/api/v1/cart");
  assert.equal(cart.body.items.length, 1);

  const ok = await buyer.agent.post("/api/v1/order/checkout").send({});
  assert.equal(ok.status, 201);
  assert.equal(ok.body.orders.length, 1);
  assert.equal((await buyer.agent.get("/api/v1/cart")).body.items.length, 0);
  assert.equal((await buyer.agent.post("/api/v1/order/checkout").send({})).status, 400);
});

test("remove from cart", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent);
  await buyer.agent.post("/api/v1/cart/add").send({ itemId: item._id });
  const res = await buyer.agent.post("/api/v1/cart/remove").send({ itemId: item._id });
  assert.equal(res.status, 200);
  assert.equal(res.body.cart.items.length, 0);
});

test("hostile input gets a clean response, never a 500", async () => {
  // a NUL byte used to crash MongoDB's regex and surface as "Internal server error"
  const nul = await request(app).get("/api/v1/item").query("search=la%00mp");
  assert.equal(nul.status, 200);

  // a body past the 100KB limit is the client's mistake: 413, not a server error
  const big = await request(app).post("/api/v1/user/login").send({ email: "a@b.co", password: "x".repeat(200_000) });
  assert.equal(big.status, 413);
  assert.match(big.body.message, /too large/i);

  // operators smuggled into query strings and bodies are rejected, not passed to MongoDB
  assert.equal((await request(app).get("/api/v1/item").query("search[$ne]=x")).status, 400);
  const inject = await request(app).post("/api/v1/user/login").send({ email: { $ne: null }, password: "x" });
  assert.equal(inject.status, 400);

  // extra fields on registration can't make an account admin or CAS
  const reg = await request(app).post("/api/v1/user/register").send({
    firstName: "Evil",
    lastName: "Admin",
    email: "evil-admin@students.iiit.ac.in",
    age: 20,
    contactNumber: "9876543210",
    password: "password123",
    isAdmin: true,
    authProvider: "cas",
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.isAdmin, false);
  assert.equal(
    (await request(app).post("/api/v1/user/login").send({ email: "evil-admin@students.iiit.ac.in", password: "password123" })).status,
    200,
    "the account must have stayed a normal password account"
  );
});

test("malformed input returns 400, not 500", async () => {
  const { agent } = await signup();
  assert.equal((await agent.get("/api/v1/item/not-an-id")).status, 400);
  assert.equal((await agent.post("/api/v1/item").send({ name: "x" })).status, 400);
  assert.equal((await agent.post("/api/v1/order").send({ item: "zzz" })).status, 400);
  assert.equal((await agent.post("/api/v1/cart/add").send({})).status, 400);
  assert.equal((await agent.put("/api/v1/user/update").send({ firstName: "A" })).status, 400);
  assert.equal(
    (await request(app).post("/api/v1/user/login").set("Content-Type", "application/json").send("{bad")).status,
    400
  );
});
