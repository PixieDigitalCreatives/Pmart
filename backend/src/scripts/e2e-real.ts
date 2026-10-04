import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { User, UserRole } from '../modules/auth/auth.model';
import { CustomerProfile } from '../modules/users/user.model';
import { RiderProfile } from '../modules/rider/rider.model';
import { Category, Product } from '../modules/catalog/catalog.model';
import { Shop } from '../modules/shop/shop.model';
import { Order, OrderStatus } from '../modules/order/order.model';
import { NotificationService } from '../services/notification.service';
import jwt from 'jsonwebtoken';

// Setup environment for testing
process.env.NODE_ENV = 'development';
process.env.SMS_PROVIDER_ENABLED = 'false';

import dotenv from 'dotenv';
dotenv.config();

let interceptedOtp = '';
NotificationService.sendDeliveryOTP = async (phone: string, orderNumber: string, otp: string) => {
  console.log(`[E2E Intercept] OTP for ${orderNumber} to ${phone} is ${otp}`);
  interceptedOtp = otp;
};

// Safe DB isolation: extract base URI and force a separate database name
const baseUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const parsedUri = new URL(baseUri.startsWith('mongodb') ? baseUri : `mongodb://${baseUri}`);
parsedUri.pathname = '/pmart_e2e_real_test';
const MONGODB_URI = parsedUri.toString();

const createToken = (userId: string, role: string) => jwt.sign({ id: userId, role }, process.env.JWT_SECRET || 'test', { expiresIn: '1h' });

async function runE2E() {
  console.log(`Connecting to REAL MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Cleaning database...');
  await mongoose.connection.dropDatabase();

  try {
    console.log('1. Auth / Setup...');
    const customer = await User.create({ phone: '+1000000001', role: UserRole.CUSTOMER, isActive: true });
    await CustomerProfile.create({ user: customer._id, fullName: 'E2E Customer', addresses: [] });
    const customerToken = createToken(customer.id, UserRole.CUSTOMER);

    const owner = await User.create({ phone: '+1000000002', role: UserRole.SHOP_OWNER, isActive: true });
    const ownerToken = createToken(owner.id, UserRole.SHOP_OWNER);

    const rider = await User.create({ phone: '+1000000003', role: UserRole.RIDER, isActive: true });
    await RiderProfile.create({ user: rider._id, fullName: 'E2E Rider', vehicleType: 'Bike', vehicleNumber: 'E2E-123', licenseNumber: 'LIC-E2E-456' });
    const riderToken = createToken(rider.id, UserRole.RIDER);

    const shop = await Shop.create({
      owner: owner._id, name: 'E2E Mart', openTime: '00:00', closeTime: '23:59',
      address: { street: '123', city: 'City', state: 'State', zipCode: '111', coordinates: { lat: 1, lng: 1 } }
    });
    const category = await Category.create({ name: 'E2E Cat', slug: 'e2e-cat' });
    const product = await Product.create({
      shop: shop._id, category: category._id, categorySlug: 'e2e-cat', name: 'E2E Item', slug: 'e2e-item',
      description: 'E2E test product',
      price: 100, stockQuantity: 5, sku: 'E2E-001', unit: 'kg', isActive: true
    });

    console.log('2. Customer Checkout...');
    const checkoutRes = await request(app).post('/api/orders/checkout')
      .set('Cookie', [`accessToken=${customerToken}`])
      .send({
        items: [{ product: product.id, shop: shop.id, quantity: 2 }],
        deliveryAddress: { street: '456', city: 'C', state: 'S', zipCode: '1', coordinates: { lat: 2, lng: 2 } },
        paymentMethod: 'COD'
      });
    
    if (checkoutRes.status !== 201) throw new Error('Checkout failed: ' + JSON.stringify(checkoutRes.body));
    const orderId = checkoutRes.body.data._id;
    console.log(`   Order created: ${orderId}`);
    console.log(`   Intercepted OTP: ${interceptedOtp}`);

    console.log('3. Shop Owner Accepts & Prepares...');
    await request(app).put(`/api/orders/${orderId}/status`).set('Cookie', [`accessToken=${ownerToken}`]).send({ status: OrderStatus.ACCEPTED });
    await request(app).put(`/api/orders/${orderId}/status`).set('Cookie', [`accessToken=${ownerToken}`]).send({ status: OrderStatus.PREPARING });
    await request(app).put(`/api/orders/${orderId}/status`).set('Cookie', [`accessToken=${ownerToken}`]).send({ status: OrderStatus.READY });
    console.log('   Order is READY');

    console.log('4. Rider Assignment (by Admin or System, here we simulate direct DB assign for speed or shop owner assigning)');
    await Order.findByIdAndUpdate(orderId, { rider: rider._id, status: OrderStatus.ASSIGNED });
    
    console.log('5. Rider Picks up & Delivers...');
    await request(app).put(`/api/orders/${orderId}/status`).set('Cookie', [`accessToken=${riderToken}`]).send({ status: OrderStatus.PICKED_UP });
    await request(app).put(`/api/orders/${orderId}/status`).set('Cookie', [`accessToken=${riderToken}`]).send({ status: OrderStatus.OUT_FOR_DELIVERY });
    await request(app).put(`/api/orders/${orderId}/status`).set('Cookie', [`accessToken=${riderToken}`]).send({ status: OrderStatus.ARRIVED });

    console.log('   Rider Collects COD...');
    await request(app).put(`/api/orders/${orderId}/payment-status`).set('Cookie', [`accessToken=${riderToken}`]).send({ paymentStatus: 'COLLECTED' });

    console.log(`   Rider submits OTP: ${interceptedOtp}`);
    const verifyOtpRes = await request(app).post(`/api/orders/${orderId}/verify-otp`).set('Cookie', [`accessToken=${riderToken}`]).send({ otp: interceptedOtp });
    if (verifyOtpRes.status !== 200) throw new Error('OTP Verification failed: ' + JSON.stringify(verifyOtpRes.body));
    
    const deliverRes = await request(app).post(`/api/orders/${orderId}/deliver`).set('Cookie', [`accessToken=${riderToken}`]);
    
    if (deliverRes.status !== 200) throw new Error('Delivery failed: ' + JSON.stringify(deliverRes.body));
    console.log('   Order successfully DELIVERED!');

    console.log('\n✅ Full E2E Customer Journey completed successfully on REAL MongoDB instance!');
  } catch (error) {
    console.error('\n❌ E2E Test Failed:', error);
    process.exit(1);
  } finally {
    console.log('Cleaning up and disconnecting...');
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runE2E();
