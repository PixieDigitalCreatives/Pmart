import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pmart');
  
  const db = mongoose.connection.db;

  const result = await db.collection('addresses').deleteMany({
    $or: [
      { recipientName: { $regex: /John Doe/i } },
      { recipientName: { $regex: /Limited Masterpiece/i } },
      { recipientPhone: "9999999999" },
    ]
  });
  
  console.log(`Deleted ${result.deletedCount} test addresses`);
  
  // Also fix the username of "Limited Masterpiece..."
  const userUpdate = await db.collection('users').updateMany(
    { name: { $regex: /Limited Masterpiece/i } },
    { $set: { name: "Shyam Mohan" } }
  );
  
  console.log(`Updated ${userUpdate.modifiedCount} test users`);

  await mongoose.disconnect();
}

run().catch(console.error);
