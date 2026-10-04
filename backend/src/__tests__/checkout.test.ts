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
  let riderToken: string;
  let customer: any;
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
      address: { street: 'Main St', city: 'City', state: 'State', zipCode: '12345', coordinates: { lat: 1, lng: 1 } },
      isActive: true,
      openTime: '09:00',
      closeTime: '21:00'
    });

    product = await Product.create({
      name: 'Test Product',
      shop: shop._id,
      price: 100,
      stockQuantity: 10,
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
        zipCode: '54321',
        coordinates: { lat: 10, lng: 10 }
      },
      paymentMethod: 'COD'
    };

    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(orderPayload);

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.subTotal).toBe(200); // 100 * 2
    
    const orderId = checkoutRes.body.data._id;
    const orderNumber = checkoutRes.body.data.orderNumber;

    // Check inventory update
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct?.stockQuantity).toBe(8); // 10 - 2

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
    // Need to get the plaintext OTP for testing. In production it's hashed, but since we use bcrypt, we can't reverse it.
    // For test purposes, let's reset the hash to a known OTP hash.
    const bcrypt = require('bcryptjs');
    const knownOtphash = await bcrypt.hash('123456', 10);
    if(order) {
        await Order.findByIdAndUpdate(orderId, { deliveryOtpHash: knownOtphash });
    }

    const otpRes = await request(app)
      .post(`/api/orders/${orderId}/verify-otp`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ otp: '123456' });

    expect(otpRes.status).toBe(200);
    expect(otpRes.body.success).toBe(true);

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
      deliveryAddress: { street: 'St', city: 'C', state: 'S', zipCode: '1', coordinates: { lat: 1, lng: 1 } },
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
    
    // Final stock should be 4
    const finalProduct = await Product.findById(product._id);
    expect(finalProduct?.stockQuantity).toBe(4);
  });
});
