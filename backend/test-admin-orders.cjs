const mongoose = require('mongoose');
require('dotenv').config();

async function testAdminOrders() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const db = mongoose.connection.db;
    const orders = await db.collection('orders').aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $lookup: {
          from: 'shops',
          localField: 'shop',
          foreignField: '_id',
          as: 'shop'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'rider',
          foreignField: '_id',
          as: 'rider'
        }
      }
    ]).toArray();
    console.log('Orders length:', orders.length);
    console.log(JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

testAdminOrders();
