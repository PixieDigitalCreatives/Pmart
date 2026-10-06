const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const product = await mongoose.connection.collection('products').findOne({ name: /Amul Taaza/i });
  console.log('Amul Taaza Milk Product:', product);
  
  process.exit(0);
}

check().catch(err => { console.error(err); process.exit(1); });
