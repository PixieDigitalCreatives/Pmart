import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Order, OrderStatus } from '../modules/order/order.model';
import { OrderAutomation } from '../modules/order/order.automation';
import { OrderProgressionJob, ProgressionJobType, ProgressionJobStatus } from '../modules/order/order.progression.model';
import { User, UserRole } from '../modules/auth/auth.model';
import { RiderProfile, RiderAvailability } from '../modules/rider/rider.model';
import { env } from '../config/env';

jest.mock('../../src/config/socket', () => ({
  getIO: jest.fn(() => ({ to: jest.fn().mockReturnValue({ emit: jest.fn() }) }))
}));
jest.mock('firebase-admin/app', () => ({ initializeApp: jest.fn(), cert: jest.fn(), getApps: jest.fn(() => []) }));
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

jest.mock('../config/env', () => ({
  env: {
    RIDER_PICKUP_DELAY_MS: 100,
    RIDER_OUT_FOR_DELIVERY_DELAY_MS: 100,
  }
}));

let mongoServer: MongoMemoryReplSet;
let riderId: string;
let customerId: string;
let shopId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());
  
  const customer = await User.create({ name: 'Cust', phone: '+918111111111', role: UserRole.CUSTOMER, isActive: true, passwordHash: 'd' });
  customerId = (customer._id as any).toString();
  
  const rider = await User.create({ name: 'Rider', phone: '+917111111111', role: UserRole.RIDER, isActive: true, passwordHash: 'd' });
  riderId = (rider._id as any).toString();
  await RiderProfile.create({ user: rider._id, vehicleType: 'BIKE', vehicleNumber: 'KA', isActive: true, availabilityStatus: RiderAvailability.AVAILABLE });
  
  shopId = new mongoose.Types.ObjectId().toString();
});

afterAll(async () => {
  OrderAutomation.stopRecoverySweeper();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Order.deleteMany({});
  await OrderProgressionJob.deleteMany({});
});

describe('Persistent Rider Progression', () => {
  it('should create a progression job when scheduled', async () => {
    const order = await Order.create({
      orderNumber: 'JOB-1', customer: customerId, shop: shopId, rider: riderId,
      status: OrderStatus.ASSIGNED, subTotal: 100, deliveryFee: 20, totalAmount: 120,
      paymentMethod: 'COD', paymentStatus: 'PENDING',
      deliveryAddress: { street: 'a', city: 'b', state: 'c', pincode: 'd', coordinates: { lat: 1, lng: 1 } },
      items: [{ product: new mongoose.Types.ObjectId(), name: 'P', price: 100, quantity: 1 }]
    });

    await OrderAutomation.scheduleRiderProgression(order._id as any, riderId as any);

    const job = await OrderProgressionJob.findOne({ order: order._id });
    expect(job).toBeTruthy();
    expect(job?.status).toBe(ProgressionJobStatus.PENDING);
    expect(job?.type).toBe(ProgressionJobType.PICKUP);
  });

  it('should process job securely and schedule next OUT_FOR_DELIVERY job', async () => {
    const order = await Order.create({
      orderNumber: 'JOB-2', customer: customerId, shop: shopId, rider: riderId,
      status: OrderStatus.ASSIGNED, subTotal: 100, deliveryFee: 20, totalAmount: 120,
      paymentMethod: 'COD', paymentStatus: 'PENDING',
      deliveryAddress: { street: 'a', city: 'b', state: 'c', pincode: 'd', coordinates: { lat: 1, lng: 1 } },
      items: [{ product: new mongoose.Types.ObjectId(), name: 'P', price: 100, quantity: 1 }]
    });

    await OrderAutomation.scheduleRiderProgression(order._id as any, riderId as any);
    const pickupJob = await OrderProgressionJob.findOne({ order: order._id, type: ProgressionJobType.PICKUP });
    expect(pickupJob).toBeTruthy();

    await OrderAutomation.executeJob(pickupJob!._id as any);

    const updatedJob = await OrderProgressionJob.findById(pickupJob!._id);
    expect(updatedJob?.status).toBe(ProgressionJobStatus.COMPLETED);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder?.status).toBe(OrderStatus.PICKED_UP);

    const outForDeliveryJob = await OrderProgressionJob.findOne({ order: order._id, type: ProgressionJobType.OUT_FOR_DELIVERY });
    expect(outForDeliveryJob).toBeTruthy();
    expect(outForDeliveryJob?.status).toBe(ProgressionJobStatus.PENDING);
  });

  it('should ignore job execution if order is cancelled', async () => {
    const order = await Order.create({
      orderNumber: 'JOB-3', customer: customerId, shop: shopId, rider: riderId,
      status: OrderStatus.CANCELLED, subTotal: 100, deliveryFee: 20, totalAmount: 120,
      paymentMethod: 'COD', paymentStatus: 'PENDING',
      deliveryAddress: { street: 'a', city: 'b', state: 'c', pincode: 'd', coordinates: { lat: 1, lng: 1 } },
      items: [{ product: new mongoose.Types.ObjectId(), name: 'P', price: 100, quantity: 1 }]
    });

    await OrderAutomation.scheduleRiderProgression(order._id as any, riderId as any);
    const pickupJob = await OrderProgressionJob.findOne({ order: order._id });
    
    await OrderAutomation.executeJob(pickupJob!._id as any);

    const updatedJob = await OrderProgressionJob.findById(pickupJob!._id);
    expect(updatedJob?.status).toBe(ProgressionJobStatus.COMPLETED); // Completed successfully, doing nothing

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder?.status).toBe(OrderStatus.CANCELLED);
  });

  it('should handle duplicate execution gracefully across concurrent workers', async () => {
    const order = await Order.create({
      orderNumber: 'JOB-4', customer: customerId, shop: shopId, rider: riderId,
      status: OrderStatus.ASSIGNED, subTotal: 100, deliveryFee: 20, totalAmount: 120,
      paymentMethod: 'COD', paymentStatus: 'PENDING',
      deliveryAddress: { street: 'a', city: 'b', state: 'c', pincode: 'd', coordinates: { lat: 1, lng: 1 } },
      items: [{ product: new mongoose.Types.ObjectId(), name: 'P', price: 100, quantity: 1 }]
    });

    await OrderAutomation.scheduleRiderProgression(order._id as any, riderId as any);
    const pickupJob = await OrderProgressionJob.findOne({ order: order._id });

    // Concurrent execution
    await Promise.allSettled([
      OrderAutomation.executeJob(pickupJob!._id as any),
      OrderAutomation.executeJob(pickupJob!._id as any)
    ]);
    
    const updated = await Order.findById(order._id);
    expect(updated?.status).toBe(OrderStatus.PICKED_UP);
    const historyCount = updated?.statusHistory.filter(h => h.status === OrderStatus.PICKED_UP).length;
    expect(historyCount).toBe(1); // Only progressed once
  });
});
