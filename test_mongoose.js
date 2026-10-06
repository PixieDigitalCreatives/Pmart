import mongoose from 'mongoose';
import { Order, OrderStatus } from './backend/src/modules/order/order.model.js';
import { Product } from './backend/src/modules/catalog/catalog.model.js';
import { User } from './backend/src/modules/user/user.model.js';

async function testRejection() {
  await mongoose.connect('mongodb://localhost:27017/pmart');
  
  // Find a pending order
  const order = await Order.findOne({ status: OrderStatus.PENDING }).populate('items.product');
  if (!order) {
    console.log('No PENDING order found.');
    process.exit(1);
  }

  console.log(`Found PENDING order: ${order._id}`);
  
  const product = await Product.findById(order.items[0].product);
  console.log(`Stock before rejection: ${product.stockCount}`);

  // Fake req.user as admin
  const admin = await User.findOne({ role: 'ADMIN' });

  // Now emulate updateOrderStatus logic manually just to see if mongoose handles it correctly
  try {
    order.status = OrderStatus.REJECTED;
    order.rejectedAt = new Date();
    order.rejectedBy = admin ? admin._id : null;
    order.rejectionReason = 'Testing rejection script';
    
    // Restock
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stockCount: item.quantity } }
      );
    }
    
    await order.save();
    console.log('Order successfully saved with REJECTED status.');

    const productAfter = await Product.findById(order.items[0].product);
    console.log(`Stock after rejection: ${productAfter.stockCount}`);

  } catch (err) {
    console.error('Failed to save order:', err);
  }
  
  process.exit(0);
}

testRejection().catch(console.error);
