import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const User = mongoose.connection.collection('users');

  const admin = await User.findOne({ email: 'admin@e2e.com' });
  const cust = await User.findOne({ email: 'customer@e2e.com' });
  const rider = await User.findOne({ email: 'rider@e2e.com' });

  const adminToken = jwt.sign({ id: (admin as any)._id, role: (admin as any).role }, process.env.JWT_SECRET || 'secret');
  const custToken = jwt.sign({ id: (cust as any)._id, role: (cust as any).role }, process.env.JWT_SECRET || 'secret');
  const riderToken = jwt.sign({ id: (rider as any)._id, role: (rider as any).role }, process.env.JWT_SECRET || 'secret');

  const envContent = `
ADMIN_TOKEN=${adminToken}
ADMIN_USER=${JSON.stringify(admin)}
CUST_TOKEN=${custToken}
CUST_USER=${JSON.stringify(cust)}
RIDER_TOKEN=${riderToken}
RIDER_USER=${JSON.stringify(rider)}
`;
  
  fs.writeFileSync('../.env.e2e', envContent.trim());
  console.log('E2E tokens generated');
  process.exit(0);
}

run();
