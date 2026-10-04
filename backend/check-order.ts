import mongoose from 'mongoose';
import { Order } from './src/modules/order/order.model';
import dotenv from 'dotenv';
dotenv.config();

async function checkOrder() {
  await mongoose.connect('mongodb+srv://shyam:Q2tK5E6vX8fQY8Y4@cluster0.zox2r.mongodb.net/pmart?retryWrites=true&w=majority');
  const order = await Order.findById('6abbda42e6ab1795072db7ce');
  console.log(JSON.stringify(order, null, 2));
  process.exit(0);
}

checkOrder().catch(console.error);
