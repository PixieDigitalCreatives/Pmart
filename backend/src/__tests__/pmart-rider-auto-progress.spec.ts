import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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
import { Shop } from '../modules/shop/shop.model';
import { Product } from '../modules/catalog/catalog.model';
import { Order, OrderStatus } from '../modules/order/order.model';
import { RiderProfile, RiderAvailability } from '../modules/rider/rider.model';
import { CustomerProfile } from '../modules/users/user.model';
import { env } from '../config/env';

import { OtpReservation } from '../modules/order/otp.service';

import { OrderAutomation } from '../modules/order/order.automation';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Ensure OtpReservation collection is created before transactions to prevent WriteConflict
  await OtpReservation.createCollection();
  
  env.RIDER_PICKUP_DELAY_MS = 100;
  env.RIDER_OUT_FOR_DELIVERY_DELAY_MS = 100;

  OrderAutomation.startRecoverySweeper();
});

afterAll(async () => {
  OrderAutomation.stopRecoverySweeper();
  env.RIDER_PICKUP_DELAY_MS = undefined;
  env.RIDER_OUT_FOR_DELIVERY_DELAY_MS = undefined;
  await mongoose.disconnect();
  if (mongoServer) { await mongoServer.stop(); }
});

const generateToken = (user: any) => {
  return jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
};

describe('Rider Auto Progression and Delivery OTP Flow', () => {
  let customerToken: string;
  let adminToken: string;
  let riderToken: string;
  let customerId: string;
  let riderId: string;
  let shopId: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    // 1. Setup tokens and entities
    const customer = await User.create({ email: 'customer@test.com', passwordHash: 'hashed', role: UserRole.CUSTOMER, phone: '1234567890' });
    customerToken = generateToken(customer);
    customerId = (customer as any)._id.toString();
    await CustomerProfile.create({ user: customer._id, fullName: 'Test Customer', addresses: [] });

    const admin = await User.create({ email: 'admin@pmart.com', passwordHash: 'hashed', role: UserRole.ADMIN, phone: '9999999999' });
    adminToken = generateToken(admin);

    const rider = await User.create({ email: 'rider@test.com', passwordHash: 'hashed', role: UserRole.RIDER, phone: '0987654321' });
    riderToken = generateToken(rider);
    riderId = (rider as any)._id.toString();
    await RiderProfile.create({ user: rider._id, fullName: 'Test Rider', vehicleType: 'Bike', vehicleNumber: 'XX-1234', licenseNumber: 'LIC-123', availabilityStatus: RiderAvailability.AVAILABLE });

    const shop = await Shop.create({ name: 'Test Shop', owner: admin._id, address: { street: '1', city: 'Sasaram', state: 'BR', pincode: '821115', coordinates: { lat: 1, lng: 1 } }, isActive: true, openTime: '09:00', closeTime: '21:00' });
    shopId = (shop as any)._id.toString();

    const product = await Product.create({ shop: shop._id, name: 'Apple', description: 'Fresh', price: 50, category: new mongoose.Types.ObjectId(), isActive: true, stockQuantity: 10, stockCount: 10, unit: 'kg', slug: 'apple-1', categorySlug: 'fruits' });
    productId = (product as any)._id.toString();
  });

  it('CUSTOMER creates COD order -> PENDING', async () => {
    const order = await Order.create({
      customer: customerId,
      shop: shopId,
      orderNumber: 'ORD-TEST-1234',
      items: [{
        product: productId,
        name: 'Apple',
        price: 50,
        quantity: 2,
        image: 'apple.png',
        unit: 'kg'
      }],
      subTotal: 100,
      deliveryFee: 10,
      totalAmount: 110,
      deliveryAddress: { street: '1', city: 'Sasaram', state: 'BR', pincode: '821115', coordinates: { lat: 1, lng: 1 } },
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      status: OrderStatus.PENDING
    });
    orderId = (order as any)._id.toString();
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('ADMIN progresses order to READY', async () => {
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.ACCEPTED });
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.PREPARING });
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: OrderStatus.READY });
    
    const order = await Order.findById(orderId);
    expect(order!.status).toBe(OrderStatus.READY);
  });

  it('ADMIN Assign Rider -> ASSIGNED -> wait -> PICKED_UP -> wait -> OUT_FOR_DELIVERY', async () => {
    const res = await request(app).patch(`/api/admin/orders/${orderId}/assign-rider`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ riderId });
    expect(res.status).toBe(200);

    const profile = await RiderProfile.findOne({ user: riderId });
    expect(profile!.availabilityStatus).toBe(RiderAvailability.BUSY);
    expect(profile!.currentDelivery?.toString()).toBe(orderId);

    // Wait for automation (up to 3 seconds)
    let order;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 200));
      order = await Order.findById(orderId);
      if (order?.status === OrderStatus.OUT_FOR_DELIVERY) break;
    }
    
    expect(order!.status).toBe(OrderStatus.OUT_FOR_DELIVERY);
  });

  it('OTP is visible to CUSTOMER but not ADMIN or RIDER before delivery', async () => {
    const custRes = await request(app).get(`/api/orders/${orderId}/otp`).set('Authorization', `Bearer ${customerToken}`);
    console.log('custRes.body:', custRes.body);
    expect(custRes.body.data?.deliveryOtp).toBeDefined(); 
    expect(custRes.body.data.deliveryOtp.length).toBe(4);

    const adminRes = await request(app).get(`/api/orders/${orderId}/otp`).set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(403); 

    const riderRes = await request(app).get(`/api/orders/${orderId}/otp`).set('Authorization', `Bearer ${riderToken}`);
    expect(riderRes.status).toBe(403); 
  });

  it('RIDER cannot deliver with incorrect OTP', async () => {
    await request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${riderToken}`).send({ status: OrderStatus.ARRIVED });

    const res = await request(app).post(`/api/orders/${orderId}/verify-otp`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ otp: '0000' }); 
    expect(res.status).toBe(400);
  });

  it('RIDER collects payment, verifies correct OTP and DELIVERS', async () => {
    const custRes = await request(app).get(`/api/orders/${orderId}/otp`).set('Authorization', `Bearer ${customerToken}`);
    const correctOtp = custRes.body.data.deliveryOtp;

    const verifyRes = await request(app).post(`/api/orders/${orderId}/verify-otp`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ otp: correctOtp });
    expect(verifyRes.status).toBe(200);

    const deliverFailRes = await request(app).post(`/api/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${riderToken}`);
    expect(deliverFailRes.status).toBe(400); 

    await request(app).put(`/api/orders/${orderId}/payment-status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ paymentStatus: 'COLLECTED' });

    const deliverRes = await request(app).post(`/api/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${riderToken}`);
    expect(deliverRes.status).toBe(200);

    const profile = await RiderProfile.findOne({ user: riderId });
    expect(profile!.availabilityStatus).toBe(RiderAvailability.AVAILABLE); 
  });
});
