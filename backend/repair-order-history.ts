import mongoose from 'mongoose';
import { Order } from './src/modules/order/order.model';
import dotenv from 'dotenv';
dotenv.config();

async function repairOrder() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  
  const orderId = '6abbda42e6ab1795072db7ce';
  const order = await Order.findById(orderId);
  
  if (!order) {
    console.log('Order not found.');
    process.exit(0);
  }

  // Create clean timeline up to ASSIGNED
  const now = Date.now();
  const cleanHistory = [
    { status: 'PENDING' as any, changedAt: new Date(now - 1000 * 60 * 20), note: 'Repaired' },
    { status: 'ACCEPTED' as any, changedAt: new Date(now - 1000 * 60 * 18), note: 'Repaired' },
    { status: 'PREPARING' as any, changedAt: new Date(now - 1000 * 60 * 15), note: 'Repaired' },
    { status: 'READY' as any, changedAt: new Date(now - 1000 * 60 * 5), note: 'Repaired' },
    { status: 'ASSIGNED' as any, changedAt: new Date(now - 1000 * 60 * 1), note: 'Repaired' }
  ];

  order.status = 'ASSIGNED' as any;
  order.statusHistory = cleanHistory as any;
  
  await order.save();
  console.log('Successfully repaired order statusHistory to PENDING -> ACCEPTED -> PREPARING -> READY -> ASSIGNED');
  process.exit(0);
}

repairOrder().catch(console.error);
