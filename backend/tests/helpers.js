'use strict';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const models = require('../src/models');
const { User } = require('../src/modules/auth/auth.model');
const { Shop } = require('../src/modules/shop/shop.model');
const { Category, Product } = require('../src/modules/catalog/catalog.model');
const { Address } = require('../src/modules/address/address.model');
const { RiderProfile } = require('../src/modules/rider/rider.model');
const { hashPassword } = require('../src/utils/auth');

let replSet;
let seq = 0;

// Test fixtures live near this point; addresses are placed ~1 km away.
const SHOP_LOCATION = { lat: 24.9588, lng: 84.0155 };
const NEAR = [84.0255, 24.9588]; // [lng, lat]
const FAR = [85.5, 25.6];

async function startDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'pmart_test' });
  for (const model of models) {
    await model.createCollection();
    await model.syncIndexes();
  }
}

async function stopDb() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

async function clearDb() {
  for (const model of models) await model.deleteMany({});
}

const nextPhone = () => `+9198${String(10000000 + (seq += 1)).slice(-8)}`;

async function createUser(role = 'CUSTOMER', overrides = {}) {
  const password = overrides.password || 'Passw0rd!';
  const user = await User.create({
    name: `${role.toLowerCase()} ${seq}`,
    phone: nextPhone(),
    role,
    profileComplete: true,
    passwordHash: await hashPassword(password),
    ...overrides,
    password: undefined
  });
  return user;
}

const tokenFor = (user) => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
const api = () => request(app);

async function createShop(owner, overrides = {}) {
  return Shop.create({
    owner: owner._id,
    name: `Store ${(seq += 1)}`,
    address: { street: 'Main Road', city: 'Sasaram', state: 'Bihar', pincode: '821115' },
    location: SHOP_LOCATION,
    openTime: '08:00',
    closeTime: '22:00',
    deliveryRadiusKm: 5,
    ...overrides
  });
}

async function createCategory(overrides = {}) {
  const n = (seq += 1);
  return Category.create({ name: `Category ${n}`, slug: `category-${n}`, ...overrides });
}

async function createProduct(shop, category, overrides = {}) {
  const n = (seq += 1);
  return Product.create({
    shop: shop._id,
    category: category._id,
    categorySlug: category.slug,
    name: `Product ${n}`,
    slug: `product-${n}`,
    unit: '1 kg',
    price: 100,
    mrp: 120,
    stockCount: 10,
    ...overrides
  });
}

async function createAddress(customer, overrides = {}) {
  return Address.create({
    user: customer._id,
    label: 'HOME',
    recipientName: 'Test Recipient',
    recipientPhone: customer.phone,
    street: 'Station Road',
    city: 'Sasaram',
    state: 'Bihar',
    pincode: '821115',
    location: { type: 'Point', coordinates: NEAR },
    isDefault: true,
    ...overrides
  });
}

async function createRider(overrides = {}, profile = {}) {
  const user = await createUser('RIDER', overrides);
  await RiderProfile.create({ user: user._id, vehicleType: 'Bike', vehicleNumber: `BR01AB${1000 + seq}`, availabilityStatus: 'AVAILABLE', ...profile });
  return user;
}

/** Builds a store with one product and a customer with a deliverable address. */
async function marketplace({ stock = 10, price = 100 } = {}) {
  const owner = await createUser('SHOP_OWNER');
  const shop = await createShop(owner);
  const category = await createCategory();
  const product = await createProduct(shop, category, { stockCount: stock, price });
  const customer = await createUser('CUSTOMER');
  const address = await createAddress(customer);
  return { owner, shop, category, product, customer, address };
}

async function placeOrder(customer, address, items, extra = {}) {
  return api()
    .post('/api/orders/checkout')
    .set(auth(customer))
    .send({ addressId: String(address._id), items: items.map(([p, q]) => ({ product: String(p._id), quantity: q })), ...extra });
}

module.exports = {
  startDb,
  stopDb,
  clearDb,
  api,
  auth,
  tokenFor,
  createUser,
  createShop,
  createCategory,
  createProduct,
  createAddress,
  createRider,
  marketplace,
  placeOrder,
  NEAR,
  FAR
};
