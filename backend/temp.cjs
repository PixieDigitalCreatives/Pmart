const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const res = await db.collection('users').updateOne(
    { email: 'hijavaaa@gmail.com' },
    { $set: { role: 'ADMIN' } }
  );
  console.log('Updated user:', res);
  process.exit(0);
}

run();
