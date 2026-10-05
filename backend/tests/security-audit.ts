import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
const jwtSecret = process.env.JWT_SECRET || 'test';

const report = {
  happyPath: 'FAIL',
  invalidTransitions: 'FAIL',
  riderAuth: 'FAIL',
  otpSecurity: 'FAIL',
  codSecurity: 'FAIL',
  duplicateActions: 'FAIL',
  roleAuth: 'FAIL',
  databaseConsistency: 'FAIL',
};

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  try {
    // 1. Setup Users
    const customer = await mongoose.connection.collection('users').findOne({ role: 'CUSTOMER' });
    const admin = await mongoose.connection.collection('users').findOne({ role: 'ADMIN' });
    const riders = await mongoose.connection.collection('users').find({ role: 'RIDER' }).limit(2).toArray();
    
    if (!customer || !admin || riders.length < 2) {
      throw new Error('Not enough users in DB to perform security audit');
    }

    const cToken = jwt.sign({ id: customer._id, role: 'CUSTOMER' }, jwtSecret, { expiresIn: '1d' });
    const aToken = jwt.sign({ id: admin._id, role: 'ADMIN' }, jwtSecret, { expiresIn: '1d' });
    const r1Token = jwt.sign({ id: riders[0]._id, role: 'RIDER' }, jwtSecret, { expiresIn: '1d' });
    const r2Token = jwt.sign({ id: riders[1]._id, role: 'RIDER' }, jwtSecret, { expiresIn: '1d' });

    const cAxios = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${cToken}` } });
    const aAxios = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${aToken}` } });
    const r1Axios = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${r1Token}` } });
    const r2Axios = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${r2Token}` } });

    // Ensure Rider 1 is available
    await mongoose.connection.collection('riderprofiles').updateOne(
      { user: riders[0]._id }, { $set: { availabilityStatus: 'AVAILABLE', isActive: true, currentDelivery: null } }
    );

    // ==========================================
    // ROLE AUTHORIZATION
    // ==========================================
    console.log('Testing Role Authorization...');
    let roleAuthPass = true;
    try {
      await cAxios.get('/admin/orders');
      roleAuthPass = false;
      console.log('FAIL: Customer could access admin endpoint');
    } catch (e: any) {
      if (e.response?.status !== 403 && e.response?.status !== 401 && e.response?.status !== 404) {
        roleAuthPass = false;
      }
    }
    
    try {
      await r1Axios.get('/admin/orders');
      roleAuthPass = false;
      console.log('FAIL: Rider could access admin endpoint');
    } catch (e: any) {
      if (e.response?.status !== 403 && e.response?.status !== 401 && e.response?.status !== 404) {
        roleAuthPass = false;
      }
    }

    try {
      await axios.get(`${API_URL}/orders`);
      roleAuthPass = false;
      console.log('FAIL: Unauthenticated access allowed');
    } catch (e: any) {
      if (e.response?.status !== 401) {
        roleAuthPass = false;
      }
    }

    if (roleAuthPass) report.roleAuth = 'PASS';

    // ==========================================
    // FRESH ORDER CREATION
    // ==========================================
    console.log('Creating fresh order...');
    const product = await mongoose.connection.collection('products').findOne({});
    if (!product) throw new Error('No product found');
    
    const checkoutRes = await cAxios.post('/orders/checkout', {
      items: [{ product: product._id.toString(), quantity: 1, shop: product.shop?.toString() || null }],
      deliveryAddress: { 
        street: '123 Test St', 
        city: 'Test City', 
        state: 'Test State', 
        pincode: '123456', 
        coordinates: { lat: 10, lng: 10 } 
      },
      paymentMethod: 'COD'
    });
    
    const orderId = checkoutRes.data.data._id;
    console.log(`Order created: ${orderId}`);

    // ==========================================
    // INVALID TRANSITIONS (PENDING state)
    // ==========================================
    console.log('Testing Invalid Transitions...');
    let invalidPass = true;
    
    const expectFail = async (fn: () => Promise<any>, msg: string) => {
      try {
        await fn();
        invalidPass = false;
        console.log(`FAIL: ${msg} succeeded but should have failed`);
      } catch (e: any) {
        if (e.response?.status !== 400 && e.response?.status !== 403 && e.response?.status !== 409) {
          invalidPass = false;
          console.log(`FAIL: ${msg} failed with unexpected status ${e.response?.status}`);
        }
      }
    };

    await expectFail(() => aAxios.put(`/orders/${orderId}/status`, { status: 'READY' }), 'PENDING -> READY');
    await expectFail(() => aAxios.put(`/orders/${orderId}/status`, { status: 'DELIVERED' }), 'PENDING -> DELIVERED');
    await expectFail(() => r1Axios.post(`/rider/orders/${orderId}/pickup`), 'PENDING -> PICKED_UP (by Rider)');

    // ==========================================
    // HAPPY PATH & SECURITY (Step-by-step)
    // ==========================================
    // PENDING -> ACCEPTED
    await aAxios.put(`/orders/${orderId}/status`, { status: 'ACCEPTED' });
    
    // PREPARING
    await aAxios.put(`/orders/${orderId}/status`, { status: 'PREPARING' });
    await expectFail(() => aAxios.patch(`/admin/orders/${orderId}/assign-rider`, { riderId: riders[0]._id.toString() }), 'PREPARING -> ASSIGNED');

    // READY
    await aAxios.put(`/orders/${orderId}/status`, { status: 'READY' });
    await expectFail(() => r1Axios.post(`/rider/orders/${orderId}/pickup`), 'READY -> PICKED_UP');
    await expectFail(() => r1Axios.put(`/orders/${orderId}/status`, { status: 'OUT_FOR_DELIVERY' }), 'READY -> OUT_FOR_DELIVERY');

    // ASSIGNED
    await aAxios.patch(`/admin/orders/${orderId}/assign-rider`, { riderId: riders[0]._id.toString() });

    // ==========================================
    // RIDER AUTHORIZATION & DUPLICATE ASSIGN
    // ==========================================
    console.log('Testing Rider Authorization & Duplicates...');
    let riderAuthPass = true;
    let duplicatePass = true;

    await expectFail(() => aAxios.patch(`/admin/orders/${orderId}/assign-rider`, { riderId: riders[1]._id.toString() }), 'Duplicate Assignment');
    
    await expectFail(() => r2Axios.post(`/rider/orders/${orderId}/pickup`), 'Rider B -> Pickup Rider A Order');
    await expectFail(() => r2Axios.put(`/orders/${orderId}/status`, { status: 'OUT_FOR_DELIVERY' }), 'Rider B -> OUT_FOR_DELIVERY Rider A Order');
    await expectFail(() => r2Axios.put(`/orders/${orderId}/status`, { status: 'ARRIVED' }), 'Rider B -> Arrive Rider A Order');

    if (riderAuthPass) report.riderAuth = 'PASS';

    // PICKED_UP -> OUT_FOR_DELIVERY
    await r1Axios.post(`/rider/orders/${orderId}/pickup`);
    await expectFail(() => r1Axios.post(`/rider/orders/${orderId}/pickup`), 'Duplicate Pickup');

    // OUT_FOR_DELIVERY (implicit from pickup)
    await expectFail(() => r1Axios.post(`/orders/${orderId}/deliver`), 'OUT_FOR_DELIVERY -> DELIVERED');

    // ARRIVED
    await r1Axios.put(`/orders/${orderId}/status`, { status: 'ARRIVED' });
    await expectFail(() => r1Axios.put(`/orders/${orderId}/status`, { status: 'ARRIVED' }), 'Duplicate Arrive');
    
    // ==========================================
    // COD SECURITY
    // ==========================================
    console.log('Testing COD Security...');
    let codPass = true;
    
    // Attempt delivery while payment is PENDING
    await expectFail(() => r1Axios.post(`/orders/${orderId}/deliver`), 'Deliver before COD payment');
    
    // Collect Payment
    await r1Axios.put(`/orders/${orderId}/payment-status`, { paymentStatus: 'COLLECTED' });
    const checkOrder = await mongoose.connection.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
    if (checkOrder?.paymentStatus !== 'COLLECTED') {
      codPass = false;
      console.log('FAIL: Payment status not updated in DB');
    }
    
    await expectFail(() => r1Axios.post(`/orders/${orderId}/deliver`), 'Deliver before OTP');
    
    if (codPass) report.codSecurity = 'PASS';

    // ==========================================
    // OTP SECURITY
    // ==========================================
    console.log('Testing OTP Security...');
    let otpPass = true;
    const actualOtp = checkOrder?.deliveryOtp;
    if (!actualOtp || !/^\d{4}$/.test(actualOtp)) {
      otpPass = false;
      console.log('FAIL: OTP is not exactly 4 digits: ' + actualOtp);
    }
    
    await expectFail(() => r1Axios.post(`/orders/${orderId}/verify-otp`, { otp: '99999' }), 'Long OTP');
    await expectFail(() => r1Axios.post(`/orders/${orderId}/verify-otp`, { otp: '12' }), 'Short OTP');
    await expectFail(() => r1Axios.post(`/orders/${orderId}/verify-otp`, { otp: 'abcd' }), 'Non-numeric OTP');
    await expectFail(() => r1Axios.post(`/orders/${orderId}/verify-otp`, { otp: '0000' }), 'Wrong OTP (assuming not 0000)');

    // Verify correct OTP
    const verifyRes = await r1Axios.post(`/orders/${orderId}/verify-otp`, { otp: actualOtp });
    if (!verifyRes.data.success) {
      otpPass = false;
      console.log('FAIL: Correct OTP rejected');
    }
    
    await expectFail(() => r1Axios.post(`/orders/${orderId}/verify-otp`, { otp: actualOtp }), 'Reused OTP');
    if (otpPass) report.otpSecurity = 'PASS';

    // ==========================================
    // DELIVER & DATABASE CONSISTENCY
    // ==========================================
    console.log('Testing Database Consistency...');
    let dbPass = true;
    
    await r1Axios.post(`/orders/${orderId}/deliver`);
    await expectFail(() => aAxios.put(`/orders/${orderId}/status`, { status: 'CANCELLED' }), 'DELIVERED -> CANCELLED');

    if (invalidPass) report.invalidTransitions = 'PASS';
    if (duplicatePass) report.duplicateActions = 'PASS';

    const finalOrder = await mongoose.connection.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
    const riderProfile = await mongoose.connection.collection('riderprofiles').findOne({ user: riders[0]._id });
    const events = await mongoose.connection.collection('orderevents').find({ order: new mongoose.Types.ObjectId(orderId) }).toArray();

    if (finalOrder?.status !== 'DELIVERED') { dbPass = false; console.log('DB FAIL: Order status not DELIVERED'); }
    if (finalOrder?.paymentStatus !== 'COLLECTED') { dbPass = false; console.log('DB FAIL: Payment status not COLLECTED'); }
    if (riderProfile?.availabilityStatus !== 'AVAILABLE') { dbPass = false; console.log('DB FAIL: Rider not AVAILABLE'); }

    const historyStatuses = finalOrder?.statusHistory.map((h: any) => h.status);
    const expectedHistory = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED'];
    if (JSON.stringify(historyStatuses) !== JSON.stringify(expectedHistory)) {
      dbPass = false;
      console.log('DB FAIL: Status history corrupted');
      console.log('Expected:', expectedHistory);
      console.log('Actual:', historyStatuses);
    }
    
    const uniqueEvents = new Set(events.map(e => e.status)).size;
    if (uniqueEvents !== expectedHistory.length) {
      dbPass = false;
      console.log('DB FAIL: Order events do not match expected length/uniqueness');
      console.log('Expected Length:', expectedHistory.length);
      console.log('Actual Unique Events Count:', uniqueEvents);
      console.log('Events Array:', events.map(e => ({ status: e.status, notes: (e as any).notes, triggeredBy: (e as any).triggeredBy })));
    }

    if (dbPass) {
      report.databaseConsistency = 'PASS';
      report.happyPath = 'PASS';
    }

  } catch (error) {
    console.error('Audit crashed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n==================================================');
    console.log('FINAL REPORT');
    console.log('==================================================');
    console.log(`HAPPY PATH:          ${report.happyPath}`);
    console.log(`INVALID TRANSITIONS: ${report.invalidTransitions}`);
    console.log(`RIDER AUTHORIZATION: ${report.riderAuth}`);
    console.log(`OTP SECURITY:        ${report.otpSecurity}`);
    console.log(`COD SECURITY:        ${report.codSecurity}`);
    console.log(`DUPLICATE ACTIONS:   ${report.duplicateActions}`);
    console.log(`ROLE AUTHORIZATION:  ${report.roleAuth}`);
    console.log(`DATABASE CONSISTENCY:${report.databaseConsistency}`);
  }
}

runAudit();
