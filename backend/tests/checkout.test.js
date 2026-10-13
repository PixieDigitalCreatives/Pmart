'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser, createAddress, createProduct, marketplace, placeOrder, FAR } = require('./helpers');
const { Product } = require('../src/modules/catalog/catalog.model');
const { Order } = require('../src/modules/order/order.model');
const { Cart } = require('../src/modules/cart/cart.model');
const { Settings } = require('../src/modules/admin/settings.model');
const { Shop } = require('../src/modules/shop/shop.model');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe('checkout', () => {
  it('places an order with server-side prices, fees and an address snapshot', async () => {
    const { product, customer, address } = await marketplace({ price: 100, stock: 10 });
    await Cart.create({ user: customer._id, items: [{ product: product._id, quantity: 2 }] });

    const res = await placeOrder(customer, address, [[product, 2]], { deliveryInstructions: 'Gate 2' });
    expect(res.status).toBe(201);
    // Defaults: free delivery from 299, base fee 15, platform fee 5.
    expect(res.body.data).toMatchObject({ status: 'PENDING', subTotal: 200, deliveryFee: 15, platformFee: 5, totalAmount: 220, paymentMethod: 'COD', paymentStatus: 'PENDING' });
    expect(res.body.data.orderNumber).toMatch(/^PM\d{6}-[0-9A-F]{6}$/);
    expect(res.body.data.deliveryAddress).toMatchObject({ city: 'Sasaram', pincode: '821115' });
    expect(res.body.data.items[0]).toMatchObject({ name: product.name, price: 100, quantity: 2 });
    expect(res.body.data.encryptedOtp).toBeUndefined();

    expect((await Product.findById(product._id)).stockCount).toBe(8);
    expect((await Cart.findOne({ user: customer._id })).items).toHaveLength(0);
  });

  it('applies free delivery at the threshold but always charges the platform fee', async () => {
    const { product, customer, address } = await marketplace({ price: 300 });
    const res = await placeOrder(customer, address, [[product, 1]]);
    expect(res.body.data).toMatchObject({ subTotal: 300, deliveryFee: 0, platformFee: 5, totalAmount: 305 });
  });

  it('uses the admin-configured fees', async () => {
    await Settings.getSingleton();
    await Settings.updateOne({}, { $set: { baseDeliveryFee: 30, platformHandlingFee: 0, freeDeliveryThreshold: 1000 } });
    const { product, customer, address } = await marketplace({ price: 100 });
    const res = await placeOrder(customer, address, [[product, 1]]);
    expect(res.body.data).toMatchObject({ deliveryFee: 30, platformFee: 0, totalAmount: 130 });
  });

  it('merges duplicate lines and rejects quantities beyond stock', async () => {
    const { product, customer, address } = await marketplace({ stock: 3 });
    const res = await placeOrder(customer, address, [[product, 2], [product, 2]]);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    expect((await Product.findById(product._id)).stockCount).toBe(3);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('never oversells the last unit under concurrent checkouts', async () => {
    const { product, address, customer } = await marketplace({ stock: 1 });
    const customer2 = await createUser('CUSTOMER');
    const address2 = await createAddress(customer2);

    const results = await Promise.all([placeOrder(customer, address, [[product, 1]]), placeOrder(customer2, address2, [[product, 1]])]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await Product.findById(product._id)).stockCount).toBe(0);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('replays an idempotent retry instead of creating a second order', async () => {
    const { product, customer, address } = await marketplace({ stock: 5 });
    const key = 'checkout-key-0001';
    const [a, b] = await Promise.all([placeOrder(customer, address, [[product, 1]], { idempotencyKey: key }), placeOrder(customer, address, [[product, 1]], { idempotencyKey: key })]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data._id).toBe(b.body.data._id);
    expect(await Order.countDocuments()).toBe(1);
    expect((await Product.findById(product._id)).stockCount).toBe(4);

    const mismatch = await placeOrder(customer, address, [[product, 2]], { idempotencyKey: key });
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.code).toBe('IDEMPOTENCY_MISMATCH');
  });

  it('scopes idempotency keys to the customer', async () => {
    const { product, customer, address } = await marketplace({ stock: 5 });
    const other = await createUser('CUSTOMER');
    const otherAddress = await createAddress(other);
    const key = 'shared-key-123456';
    expect((await placeOrder(customer, address, [[product, 1]], { idempotencyKey: key })).status).toBe(201);
    expect((await placeOrder(other, otherAddress, [[product, 1]], { idempotencyKey: key })).status).toBe(201);
  });

  it("rejects another customer's address and addresses outside the delivery radius", async () => {
    const { product, customer } = await marketplace();
    const stranger = await createUser('CUSTOMER');
    const strangersAddress = await createAddress(stranger);
    expect((await placeOrder(customer, strangersAddress, [[product, 1]])).body.code).toBe('INVALID_ADDRESS');

    const far = await createAddress(customer, { location: { type: 'Point', coordinates: FAR }, isDefault: false });
    const res = await placeOrder(customer, far, [[product, 1]]);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OUT_OF_DELIVERY_AREA');
  });

  it('refuses orders when the store is paused or the product is archived', async () => {
    const { product, customer, address, shop, category } = await marketplace();
    await Shop.updateOne({ _id: shop._id }, { isAcceptingOrders: false });
    expect((await placeOrder(customer, address, [[product, 1]])).body.code).toBe('SHOP_NOT_ACCEPTING');

    await Shop.updateOne({ _id: shop._id }, { isAcceptingOrders: true });
    const archived = await createProduct(shop, category, { isActive: false });
    expect((await placeOrder(customer, address, [[archived, 1]])).body.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects mixed-store carts and non-customers', async () => {
    const { product, customer, address, category } = await marketplace();
    const otherOwner = await createUser('SHOP_OWNER');
    const otherShop = await Shop.create({ ...(await Shop.findById(product.shop)).toObject(), _id: undefined, owner: otherOwner._id, name: 'Other' });
    const otherProduct = await createProduct(otherShop, category);
    expect((await placeOrder(customer, address, [[product, 1], [otherProduct, 1]])).body.code).toBe('MULTIPLE_SHOPS');

    const rider = await createUser('RIDER');
    expect((await api().post('/api/orders/checkout').set(auth(rider)).send({})).status).toBe(403);
  });
});

describe('cart', () => {
  it('syncs, merges duplicates and drops archived products', async () => {
    const { product, customer, shop, category } = await marketplace();
    const archived = await createProduct(shop, category, { isActive: false });
    const res = await api()
      .post('/api/cart/sync')
      .set(auth(customer))
      .send({ items: [{ product: String(product._id), quantity: 1 }, { product: String(product._id), quantity: 2 }, { product: String(archived._id), quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({ quantity: 3 });
    expect(res.body.data.removed).toBe(1);

    const get = await api().get('/api/cart').set(auth(customer));
    expect(get.body.data.items[0].product.name).toBe(product.name);
  });
});
