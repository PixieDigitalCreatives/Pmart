const mongoose = require('mongoose');
require('dotenv').config();

async function fixRoles() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const res = await db.collection('users').updateMany(
    { email: { $regex: 'admin', $options: 'i' } },
    { $set: { role: 'ADMIN' } }
  );
  console.log('Updated users:', res);
  process.exit(0);
}

fixRoles();
