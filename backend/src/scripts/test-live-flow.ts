import 'dotenv/config';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const API_URL = 'http://localhost:5000/api';
const SECRET = 'production_secret_key_change_me_in_real_prod';

async function runLiveTest() {
  if (process.env.NODE_ENV === 'production' || process.env.VITE_API_URL?.includes('pmart')) {
    console.error('ERROR: test-live-flow.ts cannot be run in production.');
    process.exit(1);
  }
  console.log('--- STARTING LIVE API TEST ---');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://pmart:Pmart%402026@pmart.sdws2dd.mongodb.net/pmart?retryWrites=true&w=majority&appName=pmart');


  const User = mongoose.connection.collection('users');
  await User.deleteMany({ email: { $in: ['c1@test.com', 'c2@test.com', 'admin@test.com', 'rider@test.com'] } });

  const customerId = new mongoose.Types.ObjectId();
  const customer2Id = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const riderId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  await User.insertMany([
    { _id: customerId, name: 'Cust1', role: 'CUSTOMER', email: 'c1@test.com', isActive: true },
    { _id: customer2Id, name: 'Cust2', role: 'CUSTOMER', email: 'c2@test.com', isActive: true },
    { _id: adminId, name: 'Admin', role: 'ADMIN', email: 'admin@test.com', isActive: true },
    { _id: riderId, name: 'Rider', role: 'RIDER', email: 'rider@test.com', isActive: true },
  ]);

  const Product = mongoose.connection.collection('products');
  await Product.deleteMany({ slug: 'test-product-live' });
  await Product.insertOne({
    _id: productId,
    name: 'Test Product',
    slug: 'test-product-live',
    shop: shopId,
    price: 100,
    stockCount: 10,
    isActive: true,
    discountPrice: 100
  });

  const custToken = jwt.sign({ id: customerId.toString(), role: 'CUSTOMER' }, SECRET);
  const cust2Token = jwt.sign({ id: customer2Id.toString(), role: 'CUSTOMER' }, SECRET);
  const adminToken = jwt.sign({ id: adminId.toString(), role: 'ADMIN' }, SECRET);
  const riderToken = jwt.sign({ id: riderId.toString(), role: 'RIDER' }, SECRET);


  const getClient = (token: string) => axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true, // Don't throw on 4xx/5xx
  });

  const cust = getClient(custToken);
  const cust2 = getClient(cust2Token);
  const admin = getClient(adminToken);
  const rider = getClient(riderToken);

  let orderId = '';
  let activeOtp = '';

  try {
  const RiderProfile = mongoose.connection.collection('riderprofiles');
  await RiderProfile.deleteMany({});
  await RiderProfile.insertMany([
    {
      user: riderId,
      fullName: 'Rider Test (Available)',
      phone: '+10000000003',
      vehicleType: 'BIKE',
      vehicleNumber: 'TEST-1234',
      licenseNumber: 'TEST-1234',
      availabilityStatus: 'AVAILABLE',
      isActive: true
    },
    {
      user: new mongoose.Types.ObjectId(),
      fullName: 'Rider Test (Busy)',
      vehicleType: 'BIKE',
      vehicleNumber: 'TEST-BUSY',
      licenseNumber: 'TEST-BUSY',
      availabilityStatus: 'BUSY',
      isActive: true
    }
  ]);

    // 2. Create Order
    console.log('Placing Order...');
    const orderRes = await cust.post('/orders/checkout', {
      items: [{ product: productId.toString(), shop: shopId.toString(), quantity: 1, price: 100 }],
      deliveryAddress: {
        street: '123 Test St', city: 'Testville', state: 'TS', pincode: '123456',
        coordinates: { lat: 28.6, lng: 77.2 }
      },
      paymentMethod: 'COD',
      totalAmount: 100
    });
    
    if (orderRes.data && orderRes.data.data) {
      orderId = orderRes.data.data._id;
    } else {
      console.log('Order creation failed:', orderRes.data);
      throw new Error('Failed to create order');
    }

    console.log('Order created:', orderId);
    console.log('Order status:', orderRes.data.data.status); // PENDING

    // 3. Admin progressions
    const res1 = await admin.patch(`/admin/orders/${orderId}/status`, { status: 'ACCEPTED' });
    if (!res1.data.success) console.log('ACCEPTED FAIL:', res1.data);
    const res2 = await admin.patch(`/admin/orders/${orderId}/status`, { status: 'PREPARING' });
    if (!res2.data.success) console.log('PREPARING FAIL:', res2.data);
    const res3 = await admin.patch(`/admin/orders/${orderId}/status`, { status: 'READY' });
    if (!res3.data.success) console.log('READY FAIL:', res3.data);
    const res4 = await admin.patch(`/admin/orders/${orderId}/assign-rider`, { riderId });
    if (!res4.data.success) console.log('ASSIGN FAIL:', res4.data);
    
    let currentOrder = (await cust.get(`/orders/${orderId}`)).data.data;
    console.log('Status after assignments:', currentOrder.status); // ASSIGNED

    // Wait for automation (PICKED_UP then OUT_FOR_DELIVERY)
    console.log('Waiting 6 seconds for automation...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    currentOrder = (await cust.get(`/orders/${orderId}`)).data.data;
    console.log('Status after automation:', currentOrder.status); // OUT_FOR_DELIVERY

    // 4. Test OTP Auth
    const otpRes = await cust.get(`/orders/${orderId}/otp`);
    console.log('Customer OTP Access:', otpRes.status);
    if (otpRes.data && otpRes.data.data) {
      activeOtp = otpRes.data.data.deliveryOtp;
      console.log('Customer OTP is 4 digits:', /^\d{4}$/.test(activeOtp));
    }

    const cust2OtpRes = await cust2.get(`/orders/${orderId}/otp`);
    console.log('Other Customer Access:', cust2OtpRes.status);

    const adminOtpRes = await admin.get(`/orders/${orderId}/otp`);
    console.log('Admin OTP Access:', adminOtpRes.status);

    const riderOtpRes = await rider.get(`/orders/${orderId}/otp`);
    console.log('Rider OTP Access:', riderOtpRes.status);

    // 5. Rider Delivery Flow
    await rider.put(`/orders/${orderId}/status`, { status: 'ARRIVED' });
    console.log('Rider updated status to ARRIVED');
    
    const wrongOtpRes = await rider.post(`/orders/${orderId}/verify-otp`, { otp: '9999' });
    console.log('Rider Wrong OTP Verification:', wrongOtpRes.status, wrongOtpRes.data?.message);

    // Collect payment
    await admin.put(`/orders/${orderId}/payment-status`, { paymentStatus: 'COLLECTED' }); 
    console.log('Payment Collected');

    // Correct OTP
    const correctOtpRes = await rider.post(`/orders/${orderId}/verify-otp`, { otp: activeOtp });
    console.log('Rider Correct OTP Verification:', correctOtpRes.status);

    const deliverRes = await rider.post(`/orders/${orderId}/deliver`);
    console.log('Rider Deliver Order:', deliverRes.status, deliverRes.data?.message);

    // Check final status
    const finalOrder = (await admin.get(`/admin/orders/${orderId}`)).data.data;
    console.log('Final Order Status:', finalOrder.status);
    console.log('OTP Verified field:', finalOrder.deliveryVerificationStatus);
    console.log('Payment Status:', finalOrder.paymentStatus);
    console.log('Plaintext OTP Exposed in GET payload?', 'deliveryOtp' in finalOrder);

  } catch (err: any) {
    console.error('Test Failed:', err.message);
  }
}

runLiveTest();
