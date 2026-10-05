import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
const jwtSecret = process.env.JWT_SECRET || 'test';

async function runIdorAudit() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB for IDOR Audit');

  try {
    // 1. Setup Users
    const customers = await mongoose.connection.collection('users').find({ role: 'CUSTOMER' }).limit(2).toArray();
    const shopOwners = await mongoose.connection.collection('users').find({ role: 'SHOP_OWNER' }).limit(2).toArray();

    if (customers.length < 2) {
      throw new Error('Need at least 2 CUSTOMER users to test IDOR');
    }
    
    const customerA = customers[0];
    const customerB = customers[1];

    const tokenA = jwt.sign({ id: customerA._id, role: 'CUSTOMER' }, jwtSecret, { expiresIn: '1d' });
    const tokenB = jwt.sign({ id: customerB._id, role: 'CUSTOMER' }, jwtSecret, { expiresIn: '1d' });

    const axiosA = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${tokenA}` }, validateStatus: () => true });
    const axiosB = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${tokenB}` }, validateStatus: () => true });

    let idorPass = true;
    let testsRun = 0;

    console.log('\n--- 1. Testing Address IDOR (Customer A -> Customer B) ---');
    // Give customer A an address if none exists
    const addressDoc = await mongoose.connection.collection('addresses').findOne({ user: customerA._id });
    if (!addressDoc) {
       console.log('Customer A has no address. Creating one...');
       await axiosA.post('/addresses', {
         location: { coordinates: [77.5946, 12.9716] },
         houseNumber: '123', pincode: '123456', street: 'IDOR Test St', city: 'Test'
       });
    }
    const aAddresses = await axiosA.get('/addresses');
    if (aAddresses.data.data.length > 0) {
      const addressId = aAddresses.data.data[0]._id;
      // Customer B tries to fetch Customer A's address
      const fetchB = await axiosB.get(`/addresses/${addressId}`);
      if (fetchB.status === 200 && fetchB.data?.data?._id === addressId) {
        console.log(`❌ FAIL: Customer B successfully fetched Customer A's address (${addressId})`);
        idorPass = false;
      } else {
        console.log(`✅ PASS: Customer B prevented from fetching Customer A's address (Status: ${fetchB.status})`);
      }
      testsRun++;

      // Customer B tries to update Customer A's address
      const updateB = await axiosB.put(`/addresses/${addressId}`, { houseNumber: 'HACKED' });
      if (updateB.status === 200) {
        console.log(`❌ FAIL: Customer B successfully updated Customer A's address (${addressId})`);
        idorPass = false;
      } else {
        console.log(`✅ PASS: Customer B prevented from updating Customer A's address (Status: ${updateB.status})`);
      }
      testsRun++;
    } else {
      console.log('Could not find or create address for Customer A. Skipping Address IDOR.');
    }

    console.log('\n--- 2. Testing Order IDOR (Customer A -> Customer B) ---');
    // Get orders for customer A
    let orderDoc = await mongoose.connection.collection('orders').findOne({ customer: customerA._id });
    if (!orderDoc) {
      console.log('Customer A has no orders. Creating a dummy order...');
      const insertRes = await mongoose.connection.collection('orders').insertOne({
        orderNumber: 'TEST-IDOR-ORD',
        customer: customerA._id,
        shop: shopOwners.length > 0 ? shopOwners[0]._id : null,
        items: [],
        subTotal: 10,
        deliveryFee: 5,
        totalAmount: 15,
        status: 'PENDING',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING'
      });
      orderDoc = await mongoose.connection.collection('orders').findOne({ _id: insertRes.insertedId });
    }
    
    if (orderDoc) {
      const orderId = orderDoc._id.toString();
      const fetchB = await axiosB.get(`/orders/${orderId}`);
      if (fetchB.status === 200 && fetchB.data?.data?._id === orderId) {
        console.log(`❌ FAIL: Customer B successfully fetched Customer A's order (${orderId})`);
        idorPass = false;
      } else {
        console.log(`✅ PASS: Customer B prevented from fetching Customer A's order (Status: ${fetchB.status})`);
      }
      testsRun++;
    } else {
      console.log('Customer A has no orders. Skipping Order IDOR test for customer.');
    }

    console.log('\n--- 3. Testing Shop Owner IDOR (ShopOwner A -> ShopOwner B) ---');
    if (shopOwners.length >= 2) {
      const ownerA = shopOwners[0];
      const ownerB = shopOwners[1];
      const tokenOwnerB = jwt.sign({ id: ownerB._id, role: 'SHOP_OWNER' }, jwtSecret, { expiresIn: '1d' });
      const axiosOwnerB = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${tokenOwnerB}` }, validateStatus: () => true });

      // Find shop for Owner A
      const shopA = await mongoose.connection.collection('shops').findOne({ owner: ownerA._id });
      if (shopA) {
        const updateB = await axiosOwnerB.put(`/shops/${shopA._id}`, { name: 'HACKED SHOP' });
        if (updateB.status === 200) {
          console.log(`❌ FAIL: Shop Owner B successfully updated Shop Owner A's shop (${shopA._id})`);
          idorPass = false;
        } else {
          console.log(`✅ PASS: Shop Owner B prevented from updating Shop Owner A's shop (Status: ${updateB.status})`);
        }
        testsRun++;

        // Shop A's orders
        const orderA = await mongoose.connection.collection('orders').findOne({ shop: shopA._id });
        if (orderA) {
          const fetchOrderB = await axiosOwnerB.get(`/orders/${orderA._id}`);
          if (fetchOrderB.status === 200 && fetchOrderB.data?.data?._id === orderA._id.toString()) {
            console.log(`❌ FAIL: Shop Owner B successfully fetched Shop A's order (${orderA._id})`);
            idorPass = false;
          } else {
             console.log(`✅ PASS: Shop Owner B prevented from fetching Shop A's order (Status: ${fetchOrderB.status})`);
          }
          testsRun++;
        }
      }
    } else {
      console.log('Need at least 2 SHOP_OWNER users to test Shop IDOR. Skipping.');
    }

    console.log('\n--- 4. Testing Rider Isolation (Rider A -> Rider B) ---');
    const riders = await mongoose.connection.collection('users').find({ role: 'RIDER' }).limit(2).toArray();
    if (riders.length >= 2) {
      const riderA = riders[0];
      const riderB = riders[1];
      const tokenRiderA = jwt.sign({ id: riderA._id, role: 'RIDER' }, jwtSecret, { expiresIn: '1d' });
      const tokenRiderB = jwt.sign({ id: riderB._id, role: 'RIDER' }, jwtSecret, { expiresIn: '1d' });
      const axiosRiderA = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${tokenRiderA}` }, validateStatus: () => true });
      const axiosRiderB = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${tokenRiderB}` }, validateStatus: () => true });

      // Create a dummy order assigned to Rider A
      const riderOrderNumber = `TEST-IDOR-RIDER-${Date.now()}`;
      const insertOrder = await mongoose.connection.collection('orders').insertOne({
        orderNumber: riderOrderNumber,
        customer: customerA._id,
        shop: shopOwners.length > 0 ? shopOwners[0]._id : null,
        rider: riderA._id,
        items: [],
        subTotal: 10,
        deliveryFee: 5,
        totalAmount: 15,
        status: 'OUT_FOR_DELIVERY',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING'
      });
      const riderOrderId = insertOrder.insertedId.toString();

      // Rider B tries to deliver Rider A's order
      const deliverB = await axiosRiderB.post(`/orders/${riderOrderId}/deliver`);
      if (deliverB.status === 200) {
        console.log(`❌ FAIL: Rider B successfully delivered Rider A's order (${riderOrderId})`);
        idorPass = false;
      } else {
        console.log(`✅ PASS: Rider B prevented from delivering Rider A's order (Status: ${deliverB.status})`);
      }
      testsRun++;
    } else {
      console.log('Need at least 2 RIDER users to test Rider IDOR. Skipping.');
    }

    console.log('\n--- 5. Testing Admin Authorization ---');
    const adminFetch = await axiosA.get('/admin/dashboard');
    if (adminFetch.status === 200) {
      console.log(`❌ FAIL: Customer successfully accessed Admin dashboard!`);
      idorPass = false;
    } else {
      console.log(`✅ PASS: Customer prevented from accessing Admin dashboard (Status: ${adminFetch.status})`);
    }
    testsRun++;

    console.log('\n--- 6. Testing Role Escalation ---');
    const roleEscalation = await axiosA.put('/users/profile', { role: 'ADMIN', name: 'Hacked Admin' });
    const checkUser = await mongoose.connection.collection('users').findOne({ _id: customerA._id });
    if (checkUser?.role === 'ADMIN') {
      console.log(`❌ FAIL: Customer successfully escalated role to ADMIN via profile update!`);
      idorPass = false;
      await mongoose.connection.collection('users').updateOne({ _id: customerA._id }, { $set: { role: 'CUSTOMER' } });
    } else {
      console.log(`✅ PASS: Customer prevented from escalating role to ADMIN`);
    }
    testsRun++;

    console.log('\n--- 7. Testing Delivery OTP Security ---');
    if (riders.length > 0) {
      const riderA = riders[0];
      const tokenRiderA = jwt.sign({ id: riderA._id, role: 'RIDER' }, jwtSecret, { expiresIn: '1d' });
      const axiosRiderA = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${tokenRiderA}` }, validateStatus: () => true });

      const otpOrderNumber = `TEST-IDOR-OTP-${Date.now()}`;
      const insertOrderOtp = await mongoose.connection.collection('orders').insertOne({
        orderNumber: otpOrderNumber,
        customer: customerA._id,
        shop: shopOwners.length > 0 ? shopOwners[0]._id : null,
        rider: riderA._id,
        items: [],
        subTotal: 10,
        deliveryFee: 5,
        totalAmount: 15,
        status: 'OUT_FOR_DELIVERY',
        deliveryVerificationStatus: 'PENDING',
        paymentMethod: 'COD',
        paymentStatus: 'COLLECTED'
      });
      const otpOrderId = insertOrderOtp.insertedId.toString();

      const deliverNoOtp = await axiosRiderA.post(`/orders/${otpOrderId}/deliver`);
      if (deliverNoOtp.status === 200) {
         console.log(`❌ FAIL: Rider successfully delivered order without OTP verification`);
         idorPass = false;
      } else {
         console.log(`✅ PASS: Rider prevented from delivering order without OTP verification (Status: ${deliverNoOtp.status})`);
      }
      testsRun++;
    } else {
      console.log('Need at least 1 RIDER user to test OTP Security. Skipping.');
    }

    console.log('\n==================================================');
    console.log(`IDOR AUDIT RESULT: ${idorPass && testsRun > 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total IDOR tests executed: ${testsRun}`);
    console.log('==================================================');

  } catch (error) {
    console.error('Audit script error:', error);
  } finally {
    // Cleanup all test orders from this and previous runs
    await mongoose.connection.collection('orders').deleteMany({ orderNumber: /^TEST-IDOR/ });
    console.log('\n[Cleanup] Removed TEST-IDOR-* orders.');
    await mongoose.disconnect();
  }
}

runIdorAudit();
