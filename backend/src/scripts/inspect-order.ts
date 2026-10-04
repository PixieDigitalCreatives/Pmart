import mongoose from 'mongoose';
import { env } from '../config/env';
import { Order } from '../modules/order/order.model';

async function verify() {
  await mongoose.connect(env.MONGODB_URI);
  const order = await Order.findById('6abe49386f8effe5d759d33f').lean();
  console.log(JSON.stringify(order, null, 2));
  process.exit(0);
}

verify().catch(console.error);
