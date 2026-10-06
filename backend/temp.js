const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ role: { $in: ['customer', 'rider'] } }).toArray();
  console.log('Customers:', users.filter(u => u.role === 'customer').map(u => u.email).slice(0, 2));
  console.log('Riders:', users.filter(u => u.role === 'rider').map(u => u.email).slice(0, 2));
  process.exit(0);
}
run();
