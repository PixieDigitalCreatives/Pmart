const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas");
  const users = await mongoose.connection.db.collection('users').countDocuments({ role: 'RIDER' });
  const profiles = await mongoose.connection.db.collection('riderprofiles').countDocuments();
  console.log("Rider users:", users);
  console.log("Rider profiles:", profiles);
  process.exit(0);
}
check();
