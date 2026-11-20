// Tests for multi-unit stock: ordering, overselling, cart quantities and restocking (env set before imports).
process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://unused";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.RESERVATION_DAYS = "7";

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
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
// Registers a fresh user and returns an agent that keeps their login cookie.
const signup = async () => {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/user/register").send({
    firstName: "Test",
    lastName: `User${++n}`,
    email: `user${n}@students.iiit.ac.in`,
    age: 20,
    contactNumber: "9876543210",
    password: "password123",
  });
  return { agent, id: res.body.user._id };
};

const listItem = async (agent, overrides = {}) =>
  (await agent.post("/api/v1/item").send({ name: "Desk lamp", price: 250, category: "misc", ...overrides })).body;

// The item as stored in the database right now.
const stock = async (id) => (await Item.findById(id)).toObject();
const state = async (id) => {
  const item = await stock(id);
  return [item.quantity, item.status];
};

test("multi-unit items: stock drops per order, status follows the stock", async () => {
  const seller = await signup();
  const [b1, b2, b3] = await Promise.all([signup(), signup(), signup()]);
  const item = await listItem(seller.agent, { name: "Notebooks", price: 40, quantity: 5 });
  assert.equal(item.quantity, 5);

  const first = await b1.agent.post("/api/v1/order").send({ item: item._id, quantity: 2 });
  assert.equal(first.status, 201);
  assert.equal(first.body.order.quantity, 2);
  assert.equal(first.body.order.amount, 80, "amount is price x quantity, worked out by the server");
  assert.deepEqual(await state(item._id), [3, "available"]);

  // still listed publicly while units remain
  assert.equal((await request(app).get("/api/v1/item").query({ search: "Notebooks" })).body.items.length, 1);

  const second = await b2.agent.post("/api/v1/order").send({ item: item._id, quantity: 3 });
  assert.equal(second.status, 201);
  assert.deepEqual(await state(item._id), [0, "reserved"]);
  assert.equal((await b3.agent.post("/api/v1/order").send({ item: item._id })).status, 409);
  assert.equal((await request(app).get("/api/v1/item").query({ search: "Notebooks" })).body.items.length, 0);

  // it only becomes "sold" once every pending order is finished
  const complete = (res) =>
    seller.agent.patch(`/api/v1/order/${res.body.order.transactionId}/complete`).send({ otp: res.body.otp });
  await complete(first);
  assert.equal((await stock(item._id)).status, "reserved");
  await complete(second);
  assert.equal((await stock(item._id)).status, "sold");
});

test("buying more than what's left is refused and changes nothing", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { quantity: 3 });

  assert.equal((await buyer.agent.post("/api/v1/order").send({ item: item._id, quantity: 4 })).status, 409);
  assert.equal((await buyer.agent.post("/api/v1/order").send({ item: item._id, quantity: 0 })).status, 400);
  assert.equal((await buyer.agent.post("/api/v1/order").send({ item: item._id, quantity: 1.5 })).status, 400);
  assert.equal((await stock(item._id)).quantity, 3);
  assert.equal(await Order.countDocuments({ item: item._id }), 0);
});

test("concurrent buyers can never oversell the stock", async () => {
  const seller = await signup();
  const buyers = await Promise.all([signup(), signup(), signup()]);
  const item = await listItem(seller.agent, { quantity: 4 });

  const results = await Promise.all(
    buyers.map((b) => b.agent.post("/api/v1/order").send({ item: item._id, quantity: 2 }))
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 409]);
  assert.equal((await stock(item._id)).quantity, 0);
  assert.equal(await Order.countDocuments({ item: item._id }), 2);
});

test("cancelling or expiring an order gives the units back", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { quantity: 3 });

  const a = await buyer.agent.post("/api/v1/order").send({ item: item._id, quantity: 3 });
  assert.deepEqual(await state(item._id), [0, "reserved"]);
  await buyer.agent.patch(`/api/v1/order/${a.body.order.transactionId}/cancel`);
  assert.deepEqual(await state(item._id), [3, "available"]);

  const b = await buyer.agent.post("/api/v1/order").send({ item: item._id, quantity: 2 });
  await Order.collection.updateOne(
    { transactionId: b.body.order.transactionId },
    { $set: { createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } }
  );
  assert.equal(await expireStaleOrders(), 1);
  assert.deepEqual(await state(item._id), [3, "available"]);
});

test("cart quantities: add, top up, set, cap at stock, then checkout in one go", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { price: 100, quantity: 3 });

  const add = (quantity) => buyer.agent.post("/api/v1/cart/add").send({ itemId: item._id, quantity });
  const set = (quantity) => buyer.agent.patch("/api/v1/cart/item").send({ itemId: item._id, quantity });

  assert.equal((await add(2)).body.items[0].quantity, 2);
  const tooMany = await add(2);
  assert.equal(tooMany.status, 409);
  assert.match(tooMany.body.message, /Only 3 available/);
  assert.equal((await add(1)).body.items[0].quantity, 3);
  assert.equal((await set(4)).status, 409);
  assert.equal((await set(0)).status, 400);
  assert.equal((await set(2)).body.items[0].quantity, 2);

  const out = await buyer.agent.post("/api/v1/order/checkout").send({});
  assert.equal(out.status, 201);
  assert.equal(out.body.orders[0].order.quantity, 2);
  assert.equal(out.body.orders[0].order.amount, 200);
  assert.equal((await stock(item._id)).quantity, 1);
  assert.equal((await buyer.agent.get("/api/v1/cart")).body.items.length, 0);
});

test("checkout rejects items not in the cart; cart quantity shrinks if the stock drops", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { quantity: 5 });
  const other = await listItem(seller.agent, { name: "Other" });

  await buyer.agent.post("/api/v1/cart/add").send({ itemId: item._id, quantity: 4 });
  assert.equal((await buyer.agent.post("/api/v1/order/checkout").send({ items: [other._id] })).status, 400);

  // the seller lowers the stock below what's in the cart
  assert.equal((await seller.agent.put(`/api/v1/item/${item._id}`).send({ quantity: 2 })).status, 200);
  assert.equal((await buyer.agent.get("/api/v1/cart")).body.items[0].quantity, 2);

  // and selling out removes the entry entirely
  await seller.agent.put(`/api/v1/item/${item._id}`).send({ quantity: 0 });
  assert.equal((await buyer.agent.get("/api/v1/cart")).body.items.length, 0);
});

test("sellers can restock, and stock input is validated", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { quantity: 1 });

  assert.equal((await seller.agent.post("/api/v1/item").send({ name: "x", price: 1, category: "c", quantity: 0 })).status, 400);
  for (const quantity of [-1, 1.5, 1001, "lots"]) {
    assert.equal((await seller.agent.put(`/api/v1/item/${item._id}`).send({ quantity })).status, 400, String(quantity));
  }

  // sell the only unit, then restock the same listing
  const bought = await buyer.agent.post("/api/v1/order").send({ item: item._id });
  await seller.agent
    .patch(`/api/v1/order/${bought.body.order.transactionId}/complete`)
    .send({ otp: bought.body.otp });
  assert.equal((await stock(item._id)).status, "sold");

  const restock = await seller.agent.put(`/api/v1/item/${item._id}`).send({ quantity: 6 });
  assert.equal(restock.status, 200);
  assert.deepEqual([restock.body.quantity, restock.body.status], [6, "available"]);
  assert.equal((await request(app).get(`/api/v1/item/${item._id}`)).body.quantity, 6);
});

test("an item with pending orders can't be deleted until they're settled", async () => {
  const seller = await signup();
  const buyer = await signup();
  const item = await listItem(seller.agent, { quantity: 4 });
  const order = await buyer.agent.post("/api/v1/order").send({ item: item._id, quantity: 1 });

  assert.equal((await seller.agent.delete(`/api/v1/item/${item._id}`)).status, 409);
  await buyer.agent.patch(`/api/v1/order/${order.body.order.transactionId}/cancel`);
  assert.equal((await seller.agent.delete(`/api/v1/item/${item._id}`)).status, 200);
});
