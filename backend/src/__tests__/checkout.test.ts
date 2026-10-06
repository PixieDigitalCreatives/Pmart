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

import app from '../app';
import { User, UserRole } from '../modules/auth/auth.model';
import { Product } from '../modules/catalog/catalog.model';
import { Order, OrderStatus, OrderEvent } from '../modules/order/order.model';
import { Shop } from '../modules/shop/shop.model';
import jwt from 'jsonwebtoken';
import { CustomerProfile } from '../modules/users/user.model';
import { RiderProfile } from '../modules/rider/rider.model';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

const generateToken = (user: any) => {
  return jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
};

describe('Checkout Flow', () => {
  let customerToken: string;
  let customer2Token: string;
  let riderToken: string;
  let customer: any;
  let customer2: any;
  let rider: any;
  let product: any;
  let shop: any;

  beforeEach(async () => {
    // Setup test data
    customer = await User.create({
      email: 'customer@test.com',
      passwordHash: 'hashed',
      role: UserRole.CUSTOMER,
      phone: '1234567890'
    });
    customerToken = generateToken(customer);

    await CustomerProfile.create({
      user: customer._id,
      fullName: 'Test Customer',
      addresses: []
    });

    customer2 = await User.create({
      email: 'customer2@test.com',
      passwordHash: 'hashed',
      role: UserRole.CUSTOMER,
      phone: '1234567892'
    });
    customer2Token = generateToken(customer2);

    await CustomerProfile.create({
      user: customer2._id,
      fullName: 'Test Customer 2',
      addresses: []
    });

    rider = await User.create({
      email: 'rider@test.com',
      passwordHash: 'hashed',
      role: UserRole.RIDER,
      phone: '0987654321'
    });
    riderToken = generateToken(rider);

    await RiderProfile.create({
      user: rider._id,
      fullName: 'Test Rider',
      vehicleType: 'Bike',
      vehicleNumber: 'XX-1234',
      licenseNumber: 'LIC-123',
      isAvailable: true
    });

    shop = await Shop.create({
      name: 'Test Shop',
      owner: new mongoose.Types.ObjectId(),
      address: { street: 'Main St', city: 'City', state: 'State', pincode: '123456', coordinates: { lat: 1, lng: 1 } },
      isActive: true,
      openTime: '09:00',
      closeTime: '21:00'
    });

    product = await Product.create({
      name: 'Test Product',
      shop: shop._id,
      price: 100,
      stockCount: 10,
      isActive: true,
      unit: 'kg',
      sku: 'TEST-SKU-123',
      description: 'Test desc',
      slug: 'test-product',
      categorySlug: 'test-category',
      category: new mongoose.Types.ObjectId()
    });
  });

  it('should successfully place an order and go through the complete lifecycle', async () => {
    // 1. Checkout
    const orderPayload = {
      items: [{ product: product._id, quantity: 2, shop: shop._id }],
      deliveryAddress: {
        street: 'Delivery St',
        city: 'Del City',
        state: 'DS',
        pincode: '543210',
        coordinates: { lat: 10, lng: 10 }
      },
      paymentMethod: 'COD'
    };

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);
    
    if (checkoutRes.status !== 201) {
      console.log('Checkout Error Response:', checkoutRes.body);
    }
    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.subTotal).toBe(200); // 100 * 2
    
    const orderId = checkoutRes.body.data._id;
    const orderNumber = checkoutRes.body.data.orderNumber;

    // Check inventory update
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.stockCount).toBe(8); // 10 - 2

    // Create admin user for status updates
    const adminUser = await User.create({
      _id: shop.owner,
      email: 'admin@test.com',
      passwordHash: 'hashed',
      role: UserRole.ADMIN,
      phone: '1111111111'
    });
    const adminToken = generateToken(adminUser);

    // 2. State transition PENDING -> ACCEPTED
    let updateRes = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`) // using ADMIN for testing
      .send({ status: OrderStatus.ACCEPTED });
    
    expect(updateRes.status).toBe(200);

    // 3. State transition ACCEPTED -> PREPARING -> READY
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.PREPARING });
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.READY });

    // 4. Assign Rider (Simulation - usually via separate endpoint or direct DB update for tests)
    const order = await Order.findById(orderId);
    if(order) {
        order.rider = rider._id;
        order.status = OrderStatus.ASSIGNED;
        await order.save();
    }

    // 5. Rider picks up and updates status
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.PICKED_UP });
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.OUT_FOR_DELIVERY });
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.ARRIVED });

    // 6. OTP Verification
    // Use the customer endpoint to retrieve the plaintext OTP
    const customerOtpRes = await request(app)
      .get(`/api/orders/${orderId}/otp`)
      .set('Authorization', `Bearer ${customerToken}`);
      
    if (customerOtpRes.status !== 200) {
      console.error('Failed to fetch OTP:', customerOtpRes.body);
    }
    const realOtp = customerOtpRes.body.data?.deliveryOtp;

    const otpRes = await request(app)
      .post(`/api/orders/${orderId}/verify-otp`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ otp: realOtp });

    if (otpRes.status !== 200) {
      console.error('OTP Verification Failed:', otpRes.body);
    }
    expect(otpRes.status).toBe(200);
    expect(otpRes.body.success).toBe(true);

    // 6.5 Update Payment Status
    await request(app)
      .put(`/api/orders/${orderId}/payment-status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ paymentStatus: 'COLLECTED' });

    // 7. Deliver
    const deliverRes = await request(app)
      .post(`/api/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send();

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.success).toBe(true);
    expect(deliverRes.body.data.status).toBe(OrderStatus.DELIVERED);
    expect(deliverRes.body.data.paymentStatus).toBe('COLLECTED');
  });

  it('should handle concurrent checkout correctly and prevent overselling', async () => {
    const orderPayload = {
      items: [{ product: product._id, quantity: 6, shop: shop._id }],
      deliveryAddress: { street: 'St', city: 'C', state: 'S', pincode: '100001', coordinates: { lat: 1, lng: 1 } },
      paymentMethod: 'COD'
    };

    // Make 2 concurrent requests. Stock is 10. Each wants 6.
    // One should succeed, one should fail.
    const [res1, res2] = await Promise.all([
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customerToken}`).send(orderPayload),
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customerToken}`).send(orderPayload)
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400); // One fails with "Not enough stock" or "High traffic"
    
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct?.stockCount).toBe(4);
  });

  it('should correctly aggregate duplicate items in the payload and prevent overselling', async () => {
    // Stock is 10. Payload requests 5 and 6 of the same item. Total 11.
    const orderPayload = {
      items: [
        { product: product._id, quantity: 5, shop: shop._id },
        { product: product._id, quantity: 6, shop: shop._id }
      ],
      deliveryAddress: { street: 'St', city: 'C', state: 'S', pincode: '100001', coordinates: { lat: 1, lng: 1 } },
      paymentMethod: 'COD'
    };

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INSUFFICIENT_STOCK');
    
    // Stock should remain unchanged
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct?.stockCount).toBe(10);
  });

  it('should return existing order when using the same idempotencyKey, and block if used by different user', async () => {
    const idempotencyKey = 'idemp-test-123';
    const orderPayload = {
      items: [{ product: product._id, quantity: 1, shop: shop._id }],
      deliveryAddress: { street: 'St', city: 'C', state: 'S', pincode: '100001', coordinates: { lat: 1, lng: 1 } },
      paymentMethod: 'COD',
      idempotencyKey
    };

    // First request creates the order
    const res1 = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    expect(res1.status).toBe(201);
    
    // Second request with same idempotencyKey and same user should return the same order
    const res2 = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.data._id).toBe(res1.body.data._id);
    
    // Stock should be 9 (only decremented once)
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct?.stockCount).toBe(9);

    // Third request with same key but different user should fail
    const res3 = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customer2Token}`) // Another customer
      .send(orderPayload);

    expect(res3.status).toBe(403);
    expect(res3.body.message).toContain('another user');

    // Fourth request with same key, same user, but different payload
    const differentPayload = {
      ...orderPayload,
      items: [{ product: new mongoose.Types.ObjectId(), quantity: 1, shop: shop._id }]
    };
    const res4 = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(differentPayload);

    expect(res4.status).toBe(400);
    expect(res4.body.message).toContain('different payload');

    // Fifth request with same key, same user, but different quantity
    const differentQuantityPayload = {
      ...orderPayload,
      items: [{ product: product._id, quantity: 2, shop: shop._id }]
    };
    const res5 = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(differentQuantityPayload);

    expect(res5.status).toBe(400);
    expect(res5.body.message).toContain('different payload');

    // Sixth request with same key, same user, but different payment method
    const differentPaymentPayload = {
      ...orderPayload,
      paymentMethod: 'CARD'
    };
    const res6 = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(differentPaymentPayload);

    expect(res6.status).toBe(400);
    expect(res6.body.message).toContain('payment method');
  });

  it('should allow checkout with duplicate items if aggregate stock is sufficient', async () => {
    // Stock is 10. Payload requests 2 and 3 of the same item. Total 5.
    const orderPayload = {
      items: [
        { product: product._id, quantity: 2, shop: shop._id },
        { product: product._id, quantity: 3, shop: shop._id }
      ],
      deliveryAddress: { street: 'St', city: 'C', state: 'S', pincode: '100001', coordinates: { lat: 1, lng: 1 } },
      paymentMethod: 'COD'
    };

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1); // Consolidated to 1 item
    expect(res.body.data.items[0].quantity).toBe(5);
    
    // Stock should be 5
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct?.stockCount).toBe(5);
  });

  it('should handle simultaneous requests using the same idempotency key gracefully', async () => {
    const idempotencyKey = 'idemp-simultaneous-123';
    const orderPayload = {
      items: [{ product: product._id, quantity: 3, shop: shop._id }],
      deliveryAddress: { street: 'St', city: 'C', state: 'S', pincode: '100001', coordinates: { lat: 1, lng: 1 } },
      paymentMethod: 'COD',
      idempotencyKey
    };

    // Make 2 simultaneous requests with same idempotency key and same user
    const [res1, res2] = await Promise.all([
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customerToken}`).send(orderPayload),
      request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${customerToken}`).send(orderPayload)
    ]);

    // One should create the order (201), the other should encounter 11000 duplicate key, retry, and return the existing order (200) or both return 201/200
    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses.every(s => s === 201 || s === 200 || s === 409)).toBeTruthy();

    const ordersCount = await Order.countDocuments({ idempotencyKey });
    expect(ordersCount).toBe(1);

    const finalProduct = await Product.findById(product._id);
    expect(finalProduct?.stockCount).toBe(7); // Decremented only once
  });

  it('should fail safely on unrelated duplicate key violations', async () => {
    const orderPayload = {
      items: [{ product: product._id, quantity: 1, shop: shop._id }],
      deliveryAddress: { street: 'St', city: 'C', state: 'S', pincode: '100001', coordinates: { lat: 1, lng: 1 } },
      paymentMethod: 'COD'
    };
    
    // Manually intercept Order.save to force an unrelated duplicate key error
    jest.spyOn(Order.prototype, 'save').mockImplementationOnce(() => {
      const err: any = new Error('Unrelated duplicate key');
      err.code = 11000;
      err.message = 'E11000 duplicate key error collection: test.orders index: orderNumber_1';
      throw err;
    });

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    // Should NOT retry and just fail to the global error handler (which returns 500)
    expect(res.status).toBe(500);
    
    // Stock should roll back
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct?.stockCount).toBe(10);
    
    jest.restoreAllMocks();
  });
});
