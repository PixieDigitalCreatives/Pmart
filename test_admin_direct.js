import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User } from './backend/src/modules/user/user.model.js';
import { Order, OrderStatus } from './backend/src/modules/order/order.model.js';

async function testRejectionDirect() {
  await mongoose.connect('mongodb://localhost:27017/pmart');
  
  // Find Admin
  const admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    console.log('No admin found');
    process.exit(1);
  }
  
  const token = jwt.sign({ id: admin._id, role: 'ADMIN' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
  
  // Find a pending order
  const order = await Order.findOne({ status: 'PENDING' });
  if (!order) {
    console.log('No PENDING order found to reject. Please create one.');
    process.exit(1);
  }
  
  console.log(`Found PENDING order: ${order._id}, attempting to reject via API...`);
  
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const rejectRes = await api.patch(`/admin/orders/${order._id}/status`, {
    status: 'REJECTED'
  });
  
  console.log(`Rejection API response status: ${rejectRes.status}`);
  console.log('Rejection API response body:', JSON.stringify(rejectRes.data, null, 2));
  
  process.exit(0);
}

testRejectionDirect().catch(console.error);
