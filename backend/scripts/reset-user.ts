import mongoose from 'mongoose';
import { User } from '../src/modules/auth/auth.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  
  // Find a user or use specific ID/email
  // The google auth uses Firebase uid or email. Shyam's email should be what was logged in.
  // We can just update all GOOGLE users to be incomplete for testing purposes.
  const users = await User.find({ authProvider: 'GOOGLE' });
  
  console.log(`Found ${users.length} Google users. Resetting them to incomplete...`);
  
  for (const u of users) {
    u.profileComplete = false;
    u.name = undefined;
    u.phone = undefined;
    u.passwordHash = undefined;
    await u.save();
    console.log(`Reset user: ${u.email} (UID: ${u._id})`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
