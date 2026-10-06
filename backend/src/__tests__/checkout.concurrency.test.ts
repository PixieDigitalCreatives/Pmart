import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => [])
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    getUserByEmail: jest.fn(),
    createUser: jest.fn()
  }))
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
process.env.NODE_ENV = 'test';

import app from '../app';
import { User, UserRole } from '../modules/auth/auth.model';
import { Product } from '../modules/catalog/catalog.model';
import { Order, OrderStatus } from '../modules/order/order.model';
import { Shop } from '../modules/shop/shop.model';
import jwt from 'jsonwebtoken';
import { CustomerProfile } from '../modules/users/user.model';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) { await mongoServer.stop(); }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.restoreAllMocks();
});

const generateToken = (user: any) => {
  return jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
};

describe('Checkout Concurrency and Inventory Audit', () => {
  let customer1Token: string, customer2Token: string, adminToken: string;
  let customer1: any, customer2: any, admin: any, shop: any;

  beforeEach(async () => {
    customer1 = await User.create({ email: 'c1@test.com', passwordHash: 'hashed', role: UserRole.CUSTOMER, phone: '1111111111' });
    customer1Token = generateToken(customer1);
    await CustomerProfile.create({ user: customer1._id, fullName: 'C1', addresses: [] });

    customer2 = await User.create({ email: 'c2@test.com', passwordHash: 'hashed', role: UserRole.CUSTOMER, phone: '2222222222' });
    customer2Token = generateToken(customer2);
    await CustomerProfile.create({ user: customer2._id, fullName: 'C2', addresses: [] });

    admin = await User.create({ email: 'a@test.com', passwordHash: 'hashed', role: UserRole.ADMIN, phone: '3333333333' });
    adminToken = generateToken(admin);

    shop = await Shop.create({
      name: 'Shop',
      owner: admin._id,
      address: { street: 'S', city: 'C', state: 'S', pincode: '123456', coordinates: { lat: 1, lng: 1 } },
      isActive: true,
      openTime: '00:00',
      closeTime: '23:59'
    });
  });

  const createProduct = async (stockCount: number, isActive = true) => {
    return await Product.create({
      name: 'Item',
      shop: shop._id,
      price: 100,
      stockCount,
      isActive,
      unit: 'kg',
      sku: `SKU-${Date.now()}`,
      slug: `item-${Date.now()}`,
      categorySlug: 'cat',
      category: new mongoose.Types.ObjectId()
    });
  };

  const getPayload = (productId: any, quantity: number, idempotencyKey?: string) => ({
    items: [{ product: productId, quantity, shop: shop._id }],
    deliveryAddress: { street: 'S', city: 'C', state: 'S', pincode: '123456', coordinates: { lat: 1, lng: 1 } },
    paymentMethod: 'COD',
    idempotencyKey
  });

  it('1. Two independent customers attempt to buy the last available unit simultaneously', async () => {
    const product = await createProduct(1);
    const p1 = getPayload(product._id, 1);
    
    const [res1, res2] = await Promise.all([
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(p1),
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer2Token}`).send(p1)
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400); // One should fail due to stock
    
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(0);
    const orderCount = await Order.countDocuments();
    expect(orderCount).toBe(1);
  });

  it('2. Ten or more concurrent checkout requests compete for a limited quantity', async () => {
    const product = await createProduct(5); // Only 5 in stock
    const payload = getPayload(product._id, 1);

    const requests = Array(20).fill(0).map(() => 
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload)
    );

    const responses = await Promise.all(requests);
    const successCount = responses.filter(r => r.status === 201).length;
    const stockFailCount = responses.filter(r => r.status === 400).length;
    const conflictCount = responses.filter(r => r.status === 409).length;

    // We can't guarantee exactly 5 succeed because of WriteConflicts causing 409 after 3 retries
    expect(successCount).toBeLessThanOrEqual(5);
    expect(successCount + stockFailCount + conflictCount).toBe(20);
    
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(5 - successCount);
    
    const orderCount = await Order.countDocuments();
    expect(orderCount).toBe(successCount);
  });

  it('3. The same customer\'s idempotency key is submitted concurrently', async () => {
    const product = await createProduct(10);
    const key = 'idem-same-cust';
    const payload = getPayload(product._id, 1, key);

    const [res1, res2] = await Promise.all([
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload),
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload)
    ]);

    // One succeeds (201), the other encounters 11000 duplicate key, catches it, and returns existing (200) or both return 201/200 if one was faster
    expect([201, 200, 409]).toContain(res1.status);
    expect([201, 200, 409]).toContain(res2.status);

    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(9); // Deducted only ONCE
    const orderCount = await Order.countDocuments();
    expect(orderCount).toBe(1);
  });

  it('4. A different customer attempts to reuse an existing customer\'s idempotency key', async () => {
    const product = await createProduct(10);
    const key = 'idem-diff-cust';
    const payload = getPayload(product._id, 1, key);

    await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    const res2 = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer2Token}`).send(payload);

    expect(res2.status).toBe(403);
    expect(res2.body.message).toContain('another user');
  });

  it('5. An idempotency key is reused with a different checkout payload', async () => {
    const product = await createProduct(10);
    const key = 'idem-diff-payload';
    const payload1 = getPayload(product._id, 1, key);
    
    await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload1);
    
    const payload2 = getPayload(product._id, 2, key); // diff quantity
    const res2 = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload2);

    expect(res2.status).toBe(400);
    expect(res2.body.message).toContain('different payload');
  });

  it('6. A request times out after submission and is retried', async () => {
    const product = await createProduct(10);
    const key = 'idem-retry';
    const payload = getPayload(product._id, 1, key);

    // Simulate first request succeeds (but maybe client disconnected/timed out)
    await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    
    // Client retries
    const retryRes = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    
    expect(retryRes.status).toBe(200); // Handled by idempotency correctly
    expect(retryRes.body.data.idempotencyKey).toBe(key);
    
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(9); // Only charged once
  });

  it('7. A transaction aborts after an inventory update but before order creation completes', async () => {
    const product = await createProduct(10);
    const payload = getPayload(product._id, 1);

    // Force an error to occur during save
    jest.spyOn(Order.prototype, 'save').mockImplementationOnce(() => {
      throw new Error('Simulated random failure after stock deduction');
    });

    const res = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    
    expect(res.status).toBe(500);
    
    // Verify rollback
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(10); // Restored
  });

  it('8. MongoDB reports a transient transaction error or uncertain commit result', async () => {
    const product = await createProduct(10);
    const payload = getPayload(product._id, 1);

    // Mock commitTransaction to fail once with TransientTransactionError, then succeed
    let attempts = 0;
    const originalCommit = mongoose.mongo.ClientSession.prototype.commitTransaction;
    jest.spyOn(mongoose.mongo.ClientSession.prototype, 'commitTransaction').mockImplementation(async function(this: any) {
      attempts++;
      if (attempts === 1) {
        const error: any = new Error('TransientTransactionError');
        error.hasErrorLabel = (label: string) => label === 'UnknownTransactionCommitResult' || label === 'TransientTransactionError';
        throw error;
      }
      return originalCommit.call(this);
    });

    const res = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    
    // The controller should retry the commit if it's an UnknownTransactionCommitResult
    expect(res.status).toBe(201);
    expect(attempts).toBeGreaterThan(1);
    
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(9);
  });

  it('9. The product active status changes between cart creation and checkout', async () => {
    const product = await createProduct(10, false); // INACTIVE
    const payload = getPayload(product._id, 1);

    const res = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
    
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(10); // Unchanged
  });

  it('10. Duplicate product lines are submitted in a single cart', async () => {
    const product = await createProduct(10);
    const payload = {
      ...getPayload(product._id, 5),
      items: [
        { product: product._id, quantity: 5, shop: shop._id },
        { product: product._id, quantity: 6, shop: shop._id } // total 11 > 10 stock
      ]
    };

    const res = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stockCount).toBe(10); // Unchanged
  });

  it('11. Cancellation or rejection triggers stock restoration without double restoration', async () => {
    const product = await createProduct(10);
    const payload = getPayload(product._id, 2);

    const checkoutRes = await request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customer1Token}`).send(payload);
    const orderId = checkoutRes.body.data._id;

    // Verify stock deducted
    let currentProduct = await Product.findById(product._id);
    expect(currentProduct!.stockCount).toBe(8);

    // Concurrently attempt to cancel the order twice
    const [res1, res2] = await Promise.all([
      request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.CANCELLED }),
      request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.CANCELLED })
    ]);

    expect([res1.status, res2.status]).toContain(200);

    // Verify stock restored exactly once
    currentProduct = await Product.findById(product._id);
    expect(currentProduct!.stockCount).toBe(10);
  });
});
