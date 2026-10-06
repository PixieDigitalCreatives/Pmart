import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { User, UserRole } from '../modules/auth/auth.model';
import { Order, OrderStatus } from '../modules/order/order.model';
import { RiderProfile, RiderAvailability } from '../modules/rider/rider.model';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Shop } from '../modules/shop/shop.model';
import { Product } from '../modules/catalog/catalog.model';
import { Cart } from '../modules/cart/cart.model';

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}));

// Mock Socket
const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
jest.mock('../config/socket', () => ({
  getIO: jest.fn(() => {
    throw new Error('Simulated Socket.IO failure');
  }),
  initSocket: jest.fn()
}));

let mongoServer: MongoMemoryReplSet;
let customerToken: string;
let customerId: string;
let adminToken: string;
let adminId: string;
let riderId: string;
let shopId: string;
let productId: string;
let orderId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());

  const admin = await User.create({ name: 'Admin', phone: '+919999999999', role: UserRole.ADMIN, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
  adminId = (admin._id as any).toString();
  adminToken = jwt.sign({ id: admin._id }, env.JWT_SECRET, { expiresIn: '1h' });

  const customer = await User.create({ name: 'Cust', phone: '+918888888888', role: UserRole.CUSTOMER, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
  customerId = (customer._id as any).toString();
  customerToken = jwt.sign({ id: customer._id }, env.JWT_SECRET, { expiresIn: '1h' });

  const rider = await User.create({ name: 'Rider', phone: '+917777777777', role: UserRole.RIDER, isActive: true, authProvider: 'PHONE', passwordHash: 'dummy' });
  riderId = (rider._id as any).toString();
  await RiderProfile.create({ user: rider._id, vehicleType: 'BIKE', vehicleNumber: 'KA01AB1234', isActive: true, availabilityStatus: RiderAvailability.AVAILABLE });

  const shop = await Shop.create({ name: 'Shop', owner: admin._id, location: { type: 'Point', coordinates: [77.5946, 12.9716] }, address: { street: 'Main', city: 'BLR', state: 'KA', pincode: '560001', country: 'IN', coordinates: { lat: 12.9716, lng: 77.5946 } }, status: 'ACTIVE', contactNumber: '000', openTime: '09:00', closeTime: '22:00' });
  shopId = (shop._id as any).toString();

  const prod = await Product.create({ name: 'Prod', shop: shop._id, description: 'Desc', price: 100, category: new mongoose.Types.ObjectId(), stockQuantity: 10, stockCount: 10, isActive: true, unit: 'kg', slug: 'prod-1', categorySlug: 'food' });
  productId = (prod._id as any).toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) { await mongoServer.stop(); }
});

describe('Socket Persistence Integrity Audit', () => {
  it('should successfully checkout despite simulated socket failure and maintain persistence', async () => {
    await Cart.create({
      user: customerId,
      shop: shopId,
      items: [{ product: productId, quantity: 1, price: 100, name: 'Prod', shop: shopId }]
    });

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ product: productId, quantity: 1, shop: shopId }],
        deliveryAddress: { street: '123', city: 'BLR', state: 'KA', pincode: '560001', coordinates: { lat: 12.97, lng: 77.59 } },
        paymentMethod: 'COD',
        idempotencyKey: 'socket-test-123'
      });
      
    console.log('CHECKOUT ERR:', res.body);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    
    // Verify persistence despite socket failure
    const order = await Order.findById(res.body.data._id);
    expect(order).toBeDefined();
    expect(order?.status).toBe(OrderStatus.PENDING);
    orderId = (order?._id as any).toString();
  });

  it('should successfully assign rider despite socket failure', async () => {
    await Order.findByIdAndUpdate(orderId, { status: OrderStatus.READY });
    
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/assign-rider`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ riderId });

    expect(res.status).toBe(200);
    
    const order = await Order.findById(orderId);
    expect(order?.status).toBe(OrderStatus.ASSIGNED);
    expect((order as any).assignedAt).toBeDefined();
    expect(order?.rider?.toString()).toBe(riderId);
  });
});
