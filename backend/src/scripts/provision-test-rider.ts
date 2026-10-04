import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User, UserRole } from '../modules/auth/auth.model';
import { RiderProfile, RiderAvailability } from '../modules/rider/rider.model';

async function provisionTestRider() {
  const targetEmail = 'wasteproduct4@gmail.com';

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected.');

    let user = await User.findOne({ email: targetEmail });
    
    if (user) {
      console.log(`User ${targetEmail} already exists. Updating to RIDER role...`);
      user.role = UserRole.RIDER;
      user.profileComplete = false;
      user.isActive = true;
      await user.save();
    } else {
      console.log(`Creating new user for ${targetEmail}...`);
      user = new User({
        email: targetEmail,
        name: 'Test Rider',
        phone: '9999999999', // Placeholder to satisfy uniqueness if needed, but wait, phone must be unique. Let's omit phone initially if possible, or use a random one.
        role: UserRole.RIDER,
        profileComplete: false,
        isActive: true,
        emailVerified: true,
        authProvider: 'GOOGLE'
      });
      // Generating a random phone to avoid unique constraint errors if running multiple times
      user.phone = Math.floor(6000000000 + Math.random() * 3999999999).toString();
      await user.save();
    }

    // Check if RiderProfile exists
    let profile = await RiderProfile.findOne({ user: user._id });
    
    if (profile) {
      console.log('RiderProfile already exists for this user. Resetting profileComplete flag.');
      profile.profileComplete = false;
      await profile.save();
    } else {
      console.log('Creating new RiderProfile...');
      profile = new RiderProfile({
        user: user._id,
        fullName: 'Test Rider',
        phone: user.phone,
        profileComplete: false,
        availabilityStatus: RiderAvailability.OFFLINE
      });
      await profile.save();
    }

    console.log(`\n✅ SUCCESSFULLY PROVISIONED TEST RIDER!`);
    console.log(`Email: ${targetEmail}`);
    console.log(`User ID: ${user._id}`);
    console.log(`Role: RIDER`);
    console.log(`\nYou can now log in using Google with ${targetEmail}`);

  } catch (error) {
    console.error('Failed to provision rider:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

provisionTestRider();
