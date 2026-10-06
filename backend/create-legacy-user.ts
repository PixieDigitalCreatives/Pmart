import mongoose from 'mongoose';
import { User, UserRole, AuthProvider } from './src/modules/auth/auth.model';
import { env } from './src/config/env';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(env.MONGODB_URI);
  
  // Create a legacy user without a passwordHash
  const user = await User.findOneAndUpdate(
    { phone: '+919999999999' },
    {
      name: 'Test Legacy User',
      phone: '+919999999999',
      role: UserRole.CUSTOMER,
      authProvider: AuthProvider.PHONE,
      isActive: true,
      profileComplete: true,
      $unset: { passwordHash: "" } // Ensure no password hash
    },
    { upsert: true, new: true }
  );

  console.log('Legacy user created:', user._id);
  await mongoose.disconnect();
};

run().catch(console.error);
