const mongoose = require('mongoose');
require('dotenv').config();

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await mongoose.connection.collection('users').updateMany({}, { $set: { role: 'ADMIN' } });
    console.log('Made all users admin. Modified count:', result.modifiedCount);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
makeAdmin();
