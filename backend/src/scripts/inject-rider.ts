import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

import { User, UserRole, AuthProvider } from '../modules/auth/auth.model';
import { RiderProfile, RiderAvailability } from '../modules/rider/rider.model';

async function injectRider() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  
  const phone = '9999999999';
  await User.deleteOne({ phone });
  await RiderProfile.deleteOne({ phone });

  const setupToken = crypto.randomBytes(32).toString('hex');
  
  const user = await User.create({
    name: 'Test Rider',
    phone,
    role: UserRole.RIDER,
    profileComplete: false,
    isActive: true,
    authProvider: AuthProvider.PHONE,
    setupToken
  });

  await RiderProfile.create({
    user: user._id,
    fullName: 'Test Rider',
    phone,
    vehicleType: 'Bike',
    vehicleNumber: 'KA-01-1234',
    licenseNumber: 'LIC-1234',
    availabilityStatus: RiderAvailability.AVAILABLE,
    profileComplete: false
  });

  console.log(`SETUP_TOKEN=${setupToken}`);
  process.exit(0);
}

injectRider().catch(console.error);
