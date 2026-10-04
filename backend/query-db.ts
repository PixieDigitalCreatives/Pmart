import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pmart');
  
  const db = mongoose.connection.db;

  console.log("--- USERS ---");
  const users = await db.collection('users').find({}).toArray();
  for (const u of users) {
    console.log(`User ID: ${u._id} | Name: ${u.name} | Phone: ${u.phone} | Role: ${u.role}`);
  }

  console.log("\n--- ADDRESSES ---");
  const addresses = await db.collection('addresses').find({}).toArray();
  for (const a of addresses) {
    console.log(`Address ID: ${a._id} | User: ${a.user} | Label: ${a.label} | isDefault: ${a.isDefault} | isActive: ${a.isActive} | Name: ${a.recipientName} | Phone: ${a.recipientPhone}`);
    console.log(`  -> ${a.formattedAddress} | Pincode: ${a.pincode} | House: ${a.houseNumber}`);
    console.log(`  -> Created At: ${a.createdAt}`);
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
