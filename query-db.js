import mongoose from 'mongoose';
import { Address } from './backend/src/modules/address/address.model.js';
import { User } from './backend/src/modules/auth/user.model.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pmart');
  
  console.log("--- USERS ---");
  const users = await User.find({});
  for (const u of users) {
    console.log(`User ID: ${u._id} | Name: ${u.name} | Phone: ${u.phone} | Role: ${u.role}`);
  }

  console.log("\n--- ADDRESSES ---");
  const addresses = await Address.find({});
  for (const a of addresses) {
    console.log(`Address ID: ${a._id} | User: ${a.user} | Label: ${a.label} | isDefault: ${a.isDefault} | Name: ${a.recipientName} | Phone: ${a.recipientPhone}`);
    console.log(`  -> ${a.formattedAddress} | Pincode: ${a.pincode} | House: ${a.houseNumber}`);
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
