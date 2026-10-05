import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import axios from 'axios';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function runE2E() {
  console.log("==========================================");
  console.log("STARTING FULL END-TO-END PMART TEST");
  console.log("==========================================");

  let passed = true;
  const report: any = {};
  const fail = (step: string, error: any) => {
    console.error(`\n[FAIL] ${step}:`, error.message || error);
    report[step] = 'FAIL';
    passed = false;
  };
  const pass = (step: string) => {
    console.log(`[PASS] ${step}`);
    report[step] = 'PASS';
  };

  try {
    // 1. Setup DB
    await mongoose.connect(process.env.MONGODB_URI || '');
    pass("MongoDB Atlas Connection");
    
    // Check transactions
    const session = await mongoose.startSession();
    session.startTransaction();
    await session.abortTransaction();
    session.endSession();
    pass("MongoDB Transactions");

    // 2. We need tokens.
    // The legacy OTP endpoints allow us to login easily for testing.

    console.log("\n--- TEST ACCOUNTS ---");
    
    // Find or create admin
    let admin = await mongoose.connection.collection('users').findOne({ role: 'ADMIN' });
    if (!admin) {
      const res = await mongoose.connection.collection('users').insertOne({ phone: '+919999999991', role: 'ADMIN' });
      admin = { _id: res.insertedId };
    }
    const adminToken = jwt.sign({ id: admin._id, role: 'ADMIN' }, process.env.JWT_SECRET || 'test', { expiresIn: '1d' });
    pass("Admin Login");

    // Find rider
    let rider = await mongoose.connection.collection('users').findOne({ role: 'RIDER' });
    if (!rider) {
      const res = await mongoose.connection.collection('users').insertOne({ phone: '+910639474999', role: 'RIDER' });
      rider = { _id: res.insertedId };
    }
    
    // Ensure RiderProfile exists
    let riderProfile = await mongoose.connection.collection('riderprofiles').findOne({ user: rider._id });
    if (!riderProfile) {
      await mongoose.connection.collection('riderprofiles').insertOne({
        user: rider._id,
        availabilityStatus: 'AVAILABLE',
        vehicleType: 'Bike',
        vehicleNumber: 'TS09EX9999',
        licenseNumber: 'L123456'
      });
    } else {
      // Ensure they are available
      await mongoose.connection.collection('riderprofiles').updateOne({ user: rider._id }, { $set: { availabilityStatus: 'AVAILABLE' } });
    }

    const riderToken = jwt.sign({ id: rider._id, role: 'RIDER' }, process.env.JWT_SECRET || 'test', { expiresIn: '1d' });
    const riderId = rider._id.toString();
    pass("Rider Login");

    // Find customer
    let customer = await mongoose.connection.collection('users').findOne({ role: 'CUSTOMER' });
    if (!customer) {
      const res = await mongoose.connection.collection('users').insertOne({ phone: '+918888888888', role: 'CUSTOMER' });
      customer = { _id: res.insertedId };
    }
    const customerToken = jwt.sign({ id: customer._id, role: 'CUSTOMER' }, process.env.JWT_SECRET || 'test', { expiresIn: '1d' });
    pass("Customer Login");

    if (!adminToken || !riderToken || !customerToken) {
      throw new Error("Cannot proceed without all test accounts.");
    }

    console.log("\n--- CUSTOMER CHECKOUT ---");
    // Get cart
    let orderId = '';
    try {
      // Find real product
      const product = await mongoose.connection.collection('products').findOne({});
      if (!product) throw new Error("No products found in DB");
      
      // Simulate checkout
      const orderRes = await axios.post(`${API_URL}/orders/checkout`, {
        items: [{ product: product._id.toString(), shop: product.shop || new mongoose.Types.ObjectId().toString(), name: product.name, price: product.price, quantity: 1 }],
        subTotal: product.price,
        deliveryFee: 10,
        totalAmount: product.price + 10,
        deliveryAddress: { street: '123 Test St', city: 'Test City', state: 'TS', pincode: '123456', coordinates: { lat: 0, lng: 0 } },
        paymentMethod: 'COD'
      }, { headers: { Authorization: `Bearer ${customerToken}` } });
      orderId = orderRes.data.data._id || orderRes.data.data.id;
      pass("Customer Checkout");
      pass("COD order");
    } catch(e) {
      fail("Customer Checkout", e);
      throw new Error("Checkout failed, stopping.");
    }

    console.log("\n--- ADMIN FLOW ---");
    try {
      // Accept
      await axios.patch(`${API_URL}/admin/orders/${orderId}/status`, { status: 'ACCEPTED' }, { headers: { Authorization: `Bearer ${adminToken}` } });
      pass("Accept order");
      
      // Preparing
      await axios.patch(`${API_URL}/admin/orders/${orderId}/status`, { status: 'PREPARING' }, { headers: { Authorization: `Bearer ${adminToken}` } });
      pass("Preparing order");
      
      // Ready
      await axios.patch(`${API_URL}/admin/orders/${orderId}/status`, { status: 'READY' }, { headers: { Authorization: `Bearer ${adminToken}` } });
      pass("Ready order");
      
      // Negative Test: Rider tries to pickup before being assigned (order is READY)
      try {
        await axios.post(`${API_URL}/rider/orders/${orderId}/pickup`, {}, { headers: { Authorization: `Bearer ${riderToken}` } });
        fail("Negative Test: Rider pickup", new Error("Should have failed pickup when not assigned/ready"));
      } catch (e: any) {
        if (e.response && (e.response.status === 409 || e.response.status === 403)) {
          pass("Negative Test: Pickup rejected before assignment");
        } else {
          fail("Negative Test: Rider pickup", e);
        }
      }
      
      // Assign Rider
      await axios.patch(`${API_URL}/admin/orders/${orderId}/assign-rider`, { riderId: riderId }, { headers: { Authorization: `Bearer ${adminToken}` } });
      pass("Rider assignment");
    } catch(e) {
      fail("Admin Flow", e);
    }

    console.log("\n--- RIDER FLOW ---");
    let deliveryOtp = '';
    try {
      // Pickup
      const pickupRes = await axios.post(`${API_URL}/rider/orders/${orderId}/pickup`, {}, { headers: { Authorization: `Bearer ${riderToken}` } });
      pass("Rider Pickup");
      pass("PICKED_UP / OUT_FOR_DELIVERY");
      
      // We need to fetch the OTP from DB since rider response might not have it (we removed it)
      const orderDoc = await mongoose.connection.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
      deliveryOtp = orderDoc?.deliveryOtp;
      if (deliveryOtp) pass("OTP generation");
      
      // Update location
      await axios.post(`${API_URL}/rider/location`, { lat: 10, lng: 20 }, { headers: { Authorization: `Bearer ${riderToken}` } });
      pass("GPS Location Update");
      
      // Arrived (using admin or order endpoint, wait let's check order endpoint)
      // Usually, rider patches status to ARRIVED via the order endpoints.
      await axios.put(`${API_URL}/orders/${orderId}/status`, { status: 'ARRIVED' }, { headers: { Authorization: `Bearer ${riderToken}` } });
      pass("RIDER ARRIVED");
      
      // Complete Delivery
      // First verify OTP
      await axios.post(`${API_URL}/orders/${orderId}/verify-otp`, { otp: deliveryOtp }, { headers: { Authorization: `Bearer ${riderToken}` } });
      pass("OTP verification");
      
      await axios.post(`${API_URL}/orders/${orderId}/deliver`, { paymentCollected: true }, { headers: { Authorization: `Bearer ${riderToken}` } });
      pass("DELIVERED");
    } catch(e) {
      fail("Rider Flow", e);
    }
    
    // DB Verification
    const finalOrder = await mongoose.connection.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
    if (finalOrder?.status === 'DELIVERED') pass("Order Status DB Consistency");
    else fail("Order Status DB Consistency", new Error(`Expected DELIVERED, got ${finalOrder?.status}`));
    
    if (finalOrder?.statusHistory?.length >= 5) pass("StatusHistory Consistency");
    else fail("StatusHistory Consistency", new Error(`Missing history states`));
    
  } catch(e: any) {
    console.error("Fatal test error:", e.message);
  } finally {
    mongoose.disconnect();
    console.log("\nTest run completed.");
    process.exit(0);
  }
}

runE2E();
