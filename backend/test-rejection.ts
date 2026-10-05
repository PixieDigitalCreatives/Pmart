import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    
    // admin login
    const admin = await mongoose.connection.collection('users').findOne({ role: 'ADMIN' });
    const adminToken = jwt.sign({ id: admin!._id, role: 'ADMIN' }, process.env.JWT_SECRET || 'test', { expiresIn: '1d' });

    // customer login
    const customer = await mongoose.connection.collection('users').findOne({ role: 'CUSTOMER' });
    const customerToken = jwt.sign({ id: customer!._id, role: 'CUSTOMER' }, process.env.JWT_SECRET || 'test', { expiresIn: '1d' });

    // Ensure some product has stock
    const product = await mongoose.connection.collection('products').findOne({});
    if (product) {
      await mongoose.connection.collection('products').updateOne({ _id: product._id }, { $set: { stockCount: 100, isActive: true } });
    }

    // Checkout
    const orderRes = await axios.post(`${API_URL}/orders/checkout`, {
      items: [{ product: product!._id.toString(), shop: product!.shop || new mongoose.Types.ObjectId().toString(), name: product!.name, price: product!.price, quantity: 1 }],
      subTotal: product!.price,
      deliveryFee: 10,
      totalAmount: product!.price + 10,
      deliveryAddress: { street: '123 Test St', city: 'Test City', state: 'TS', pincode: '123456', coordinates: { lat: 28, lng: 77 } },
      paymentMethod: 'COD'
    }, { headers: { Authorization: `Bearer ${customerToken}` } });
    
    const orderId = orderRes.data.data._id || orderRes.data.data.id;
    console.log('Order created:', orderId);

    // Try to reject
    console.log('Attempting to reject order...');
    const rejectRes = await axios.patch(`${API_URL}/admin/orders/${orderId}/status`, { status: 'REJECTED' }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Rejection Success:', rejectRes.data);

  } catch (e: any) {
    if (e.response) {
      console.error('Rejection Failed:', e.response.status, e.response.data);
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

run();
