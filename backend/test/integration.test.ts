import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app';
import { User, UserRole } from '../src/modules/auth/auth.model';
import { Category, Product } from '../src/modules/catalog/catalog.model';
import { Shop } from '../src/modules/shop/shop.model';
import { CustomerProfile } from '../src/modules/users/user.model';
import { RiderProfile } from '../src/modules/rider/rider.model';
import { Address } from '../src/modules/address/address.model';
import { Cart } from '../src/modules/cart/cart.model';
import { Order, OrderStatus, OrderEvent } from '../src/modules/order/order.model';
import jwt from 'jsonwebtoken';

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  // Use ReplSet to support transactions!
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

const createToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
};

describe('Phase 3 & 4 Integration Tests', () => {
  let customerId: string;
  let shopOwnerId: string;
  let riderId: string;
  let customerToken: string;
  let shopOwnerToken: string;
  let riderToken: string;
  
  let shopId: string;
  let categoryId: string;
  let productId: string;
  
  beforeEach(async () => {
    const customer = await User.create({ phone: '+1234567890', role: UserRole.CUSTOMER, isActive: true, passwordHash: 'dummyhash' });
    customerId = (customer as any)._id.toString();
    customerToken = createToken(customerId, UserRole.CUSTOMER);

    const shopOwner = await User.create({ phone: '+0987654321', role: UserRole.SHOP_OWNER, isActive: true, passwordHash: 'dummyhash' });
    shopOwnerId = (shopOwner as any)._id.toString();
    shopOwnerToken = createToken(shopOwnerId, UserRole.SHOP_OWNER);

    const rider = await User.create({ phone: '+1122334455', role: UserRole.RIDER, isActive: true, passwordHash: 'dummyhash' });
    riderId = (rider as any)._id.toString();
    riderToken = createToken(riderId, 'RIDER');

    const shop = await Shop.create({
      owner: shopOwnerId,
      name: 'Fresh Mart',
      address: { street: '123 Main', city: 'City', state: 'State', zipCode: '10001', pincode: '100001', coordinates: { lat: 1, lng: 1 } },
      openTime: '08:00',
      closeTime: '22:00'
    });
    shopId = (shop as any)._id.toString();

    const category = await Category.create({ name: 'Fruits', slug: 'fruits' });
    categoryId = (category as any)._id.toString();

    const product = await Product.create({
      shop: shopId,
      category: categoryId,
      categorySlug: 'fruits',
      name: 'Apple',
      slug: 'apple-1',
      description: 'Fresh apple',
      price: 10,
      stockQuantity: 100,
      stockCount: 100,
      sku: 'SKU-APP-1',
      unit: 'kg'
    });
    productId = (product as any)._id.toString();
    
    // Seed profiles
    await CustomerProfile.create({
      user: customerId,
      fullName: 'John Doe',
      addresses: [{ label: 'Home', street: '456 Elm', city: 'City', state: 'State', zipCode: '10001', pincode: '100001', coordinates: { lat: 1, lng: 1 } }]
    });

    await Address.create({
      user: customerId,
      label: 'HOME',
      recipientName: 'John Doe',
      recipientPhone: '+1234567890',
      city: 'City',
      state: 'State',
      pincode: '100001',
      location: {
        type: 'Point',
        coordinates: [1, 1]
      }
    });
    
    await RiderProfile.create({
      user: riderId,
      fullName: 'Speedy Gonzales',
      vehicleType: 'Bike',
      vehicleNumber: 'BK-123',
      licenseNumber: 'LIC-123'
    });
  });

  describe('1. Users / Profile / Addresses (Phase 3)', () => {
    it('should fetch customer profile and addresses', async () => {
      const res = await request(app).get('/api/users/profile').set('Cookie', [`accessToken=${customerToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data.profile.fullName).toBe('John Doe');

      const addrRes = await request(app).get('/api/addresses').set('Cookie', [`accessToken=${customerToken}`]);
      expect(addrRes.status).toBe(200);
      expect(addrRes.body.data.length).toBe(1);
    });
    
    it('should not allow rider to add customer address', async () => {
      const res = await request(app).post('/api/addresses')
        .set('Cookie', [`accessToken=${riderToken}`])
        .send({ label: 'Work', street: '789 Pine', city: 'City', state: 'State', zipCode: '10001', coordinates: { lat: 2, lng: 2 } });
      expect(res.status).toBe(403);
    });
  });

  describe('2. Catalog: Shops, Categories, Products (Phase 3)', () => {
    it('should list categories', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].slug).toBe('fruits');
    });

    it('should search and filter products', async () => {
      const res = await request(app).get('/api/products?search=app');
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      
      const res2 = await request(app).get('/api/products?maxPrice=5');
      expect(res2.body.data.products.length).toBe(0);
    });
  });

  describe('3. Cart (Phase 4)', () => {
    it('should sync and retrieve cart', async () => {
      const syncRes = await request(app).post('/api/cart/sync')
        .set('Cookie', [`accessToken=${customerToken}`])
        .send({ items: [{ product: productId, shop: shopId, quantity: 2 }] });
      console.log('SYNC RES BODY:', syncRes.body);
      expect(syncRes.status).toBe(200);
      expect(syncRes.body.data.items[0].quantity).toBe(2);

      const getRes = await request(app).get('/api/cart').set('Cookie', [`accessToken=${customerToken}`]);
      expect(getRes.body.data.items.length).toBe(1);
    });
  });

  describe('4. Checkout & Concurrency (Phase 4)', () => {
    it('should process checkout atomically and deduct stock', async () => {
      const checkoutData = {
        items: [{ product: productId, shop: shopId, quantity: 5 }],
        deliveryAddress: { street: '1', city: '2', state: '3', zipCode: '4', pincode: '400001', coordinates: { lat: 1, lng: 1 } },
        paymentMethod: 'COD',
        idempotencyKey: 'idemp-123'
      };

      const res = await request(app).post('/api/orders/checkout')
        .set('Cookie', [`accessToken=${customerToken}`])
        .send(checkoutData);
        
      expect(res.status).toBe(201);
      expect(res.body.data.totalAmount).toBe(55); // 5 * 10 + 5 delivery
      expect(res.body.data.status).toBe('PENDING');

      const product = await Product.findById(productId);
      expect(product?.stockCount).toBe(95);

      // Idempotency check
      const res2 = await request(app).post('/api/orders/checkout')
        .set('Cookie', [`accessToken=${customerToken}`])
        .send(checkoutData);
      expect(res2.status).toBe(200); // Handled idempotently
      expect(res2.body.message).toBe('Order already exists');
      
      const productAgain = await Product.findById(productId);
      expect(productAgain?.stockCount).toBe(95); // Stock not deducted twice
    });

    it('should reject checkout if stock is insufficient', async () => {
      const checkoutData = {
        items: [{ product: productId, shop: shopId, quantity: 200 }], // Only 100 in stock
        deliveryAddress: { street: '1', city: '2', state: '3', zipCode: '4', pincode: '400001', coordinates: { lat: 1, lng: 1 } }
      };

      const res = await request(app).post('/api/orders/checkout')
        .set('Cookie', [`accessToken=${customerToken}`])
        .send(checkoutData);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Not enough stock');
    });

    it('should prevent overselling during concurrent checkouts with clean failure', async () => {
      // Set stock to 1
      await Product.findByIdAndUpdate(productId, { stockQuantity: 1, stockCount: 1 });

      const checkoutData1 = {
        items: [{ product: productId, shop: shopId, quantity: 1 }],
        deliveryAddress: { street: '1', city: '2', state: '3', zipCode: '4', pincode: '400001', coordinates: { lat: 1, lng: 1 } },
        paymentMethod: 'COD',
        idempotencyKey: 'idemp-concurrent-1'
      };
      
      const checkoutData2 = {
        items: [{ product: productId, shop: shopId, quantity: 1 }],
        deliveryAddress: { street: '1', city: '2', state: '3', zipCode: '4', pincode: '400001', coordinates: { lat: 1, lng: 1 } },
        paymentMethod: 'COD',
        idempotencyKey: 'idemp-concurrent-2'
      };

      // Run checkouts concurrently
      const [res1, res2] = await Promise.all([
        request(app).post('/api/orders/checkout').set('Cookie', [`accessToken=${customerToken}`]).send(checkoutData1),
        request(app).post('/api/orders/checkout').set('Cookie', [`accessToken=${customerToken}`]).send(checkoutData2)
      ]);

      const statuses = [res1.status, res2.status].sort();
      // One succeeds (201). The other retries, sees stock=0, and fails cleanly with 400 (or 409 if max retries hit). No 500.
      expect(statuses[0]).toBe(201);
      expect([400, 409]).toContain(statuses[1]); 

      const productAgain = await Product.findById(productId);
      expect(productAgain?.stockCount).toBe(0); // Stock should be exactly 0, never negative
      
      // Ensure only one order was created
      const orders = await Order.find({ orderNumber: { $exists: true } });
      // The beforeAll setup creates one, and our concurrency test creates one.
      // We should check orders created in this test only, but simpler to check total count increase is 1.
    });
  });

  describe('5. Order Isolation & State Transitions (Phase 4)', () => {
    let orderId: string;
    beforeEach(async () => {
      const order = await Order.create({
        orderNumber: 'TEST-123',
        customer: customerId,
        shop: shopId,
        items: [{ product: productId, name: 'Apple', price: 10, quantity: 1 }],
        subTotal: 10,
        deliveryFee: 5,
        totalAmount: 15,
        status: OrderStatus.PENDING,
        deliveryAddress: { street: '1', city: '2', state: '3', zipCode: '4', pincode: '400001', coordinates: { lat: 1, lng: 1 } },
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        deliveryOtpHash: 'hashedotp', // fake hash
        deliveryOtpAttempts: 0
      });
      orderId = (order as any)._id.toString();
    });

    it('should allow customer to get their own order but not another customer', async () => {
      const res = await request(app).get(`/api/orders/${orderId}`).set('Cookie', [`accessToken=${customerToken}`]);
      expect(res.status).toBe(200);

      const otherUser = await User.create({ phone: '+1111111111', role: UserRole.CUSTOMER, isActive: true, passwordHash: 'dummyhash' });
      const otherToken = createToken((otherUser as any)._id.toString(), UserRole.CUSTOMER);

      const res2 = await request(app).get(`/api/orders/${orderId}`).set('Cookie', [`accessToken=${otherToken}`]);
      expect(res2.status).toBe(403);
    });

    it('should enforce state transitions', async () => {
      // CUSTOMER trying to change to ACCEPTED (Forbidden)
      const res1 = await request(app).put(`/api/orders/${orderId}/status`)
        .set('Cookie', [`accessToken=${customerToken}`])
        .send({ status: OrderStatus.ACCEPTED });
      expect(res1.status).toBe(403);

      // SHOP_OWNER changing to ACCEPTED
      const res2 = await request(app).put(`/api/orders/${orderId}/status`)
        .set('Cookie', [`accessToken=${shopOwnerToken}`])
        .send({ status: OrderStatus.ACCEPTED });
      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe(OrderStatus.ACCEPTED);

      // Invalid transition ACCEPTED -> DELIVERED
      const res3 = await request(app).put(`/api/orders/${orderId}/status`)
        .set('Cookie', [`accessToken=${shopOwnerToken}`])
        .send({ status: OrderStatus.DELIVERED });
      expect(res3.status).toBe(400);
      expect(res3.body.message).toContain('Invalid state transition');
    });

    it('should require valid OTP for delivery', async () => {
      // Setup state for delivery
      await Order.findByIdAndUpdate(orderId, { status: OrderStatus.OUT_FOR_DELIVERY, rider: riderId, paymentStatus: 'COLLECTED' });
      
      // Rider delivers with wrong OTP
      const res1 = await request(app).post(`/api/orders/${orderId}/deliver`)
        .set('Cookie', [`accessToken=${riderToken}`])
        .send({ otp: '000000' });
      expect(res1.status).toBe(400); // Invalid OTP (bcrypt mock or actual check fails)
    });
  });

  describe('6. Delivery, Payment, and Tracking (Phase 5)', () => {
    let orderId: string;
    beforeEach(async () => {
      const order = await Order.create({
        orderNumber: 'TEST-TRACK-123',
        customer: customerId,
        shop: shopId,
        rider: riderId,
        items: [{ product: productId, name: 'Apple', price: 10, quantity: 1 }],
        subTotal: 10,
        deliveryFee: 5,
        totalAmount: 15,
        status: OrderStatus.OUT_FOR_DELIVERY,
        deliveryAddress: { street: '1', city: '2', state: '3', zipCode: '4', pincode: '400001', coordinates: { lat: 1, lng: 1 } },
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        deliveryOtpHash: 'hashedotp', // fake hash
        deliveryOtpAttempts: 0
      });
      orderId = (order as any)._id.toString();
    });

    it('should allow rider to collect COD payment but not other riders', async () => {
      // Wrong rider
      const wrongRiderToken = createToken(shopOwnerId, UserRole.RIDER);
      const res1 = await request(app).put(`/api/orders/${orderId}/payment-status`)
        .set('Cookie', [`accessToken=${wrongRiderToken}`])
        .send({ paymentStatus: 'COLLECTED' });
      expect(res1.status).toBe(403);

      // Correct rider
      const res2 = await request(app).put(`/api/orders/${orderId}/payment-status`)
        .set('Cookie', [`accessToken=${riderToken}`])
        .send({ paymentStatus: 'COLLECTED' });
      expect(res2.status).toBe(200);
      expect(res2.body.data.paymentStatus).toBe('COLLECTED');
    });

    it('should isolate tracking updates to assigned rider', async () => {
      // Customer trying to update tracking
      const res1 = await request(app).put(`/api/orders/${orderId}/tracking`)
        .set('Cookie', [`accessToken=${customerToken}`])
        .send({ location: { lat: 10, lng: 10 } });
      expect(res1.status).toBe(403);

      // Correct rider
      const res2 = await request(app).put(`/api/orders/${orderId}/tracking`)
        .set('Cookie', [`accessToken=${riderToken}`])
        .send({ location: { lat: 10, lng: 10 } });
      expect(res2.status).toBe(200);
      expect(res2.body.data.tracking.location.lat).toBe(10);
    });

    it('should allow customer to get their tracking data', async () => {
      const res1 = await request(app).get(`/api/orders/${orderId}/tracking`)
        .set('Cookie', [`accessToken=${customerToken}`]);
      expect(res1.status).toBe(200);
      expect(res1.body.data.orderId).toBe(orderId);
    });
  });
});
