import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User, UserRole } from '../modules/auth/auth.model';
import { RiderProfile } from '../modules/rider/rider.model';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  console.log('--- RIDER INTEGRITY AUDIT ---');
  
  const riders = await User.find({ role: UserRole.RIDER }).lean();
  console.log(`Total RIDER users found: ${riders.length}`);

  let missingProfilesCount = 0;

  for (const rider of riders) {
    const profile = await RiderProfile.findOne({ user: rider._id }).lean();
    
    console.log(`\nUser ID: ${rider._id}`);
    console.log(`Email: ${rider.email || 'N/A'}`);
    console.log(`Role: ${rider.role}`);
    console.log(`RiderProfile found: ${profile ? 'Yes' : 'No'}`);
    console.log(`profileComplete: ${rider.profileComplete}`);

    if (!profile) {
      missingProfilesCount++;
    }
  }

  console.log('\n--- ORPHAN AUDIT ---');
  const profiles = await RiderProfile.find().lean();
  console.log(`Total RiderProfiles found: ${profiles.length}`);

  let orphanCount = 0;
  for (const profile of profiles) {
    const user = await User.findById(profile.user).lean();
    if (!user) {
      console.log(`Orphan Profile ID: ${profile._id} points to non-existent User: ${profile.user}`);
      orphanCount++;
    }
  }

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`RIDER users without RiderProfile: ${missingProfilesCount}`);
  console.log(`Orphan RiderProfiles: ${orphanCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

runAudit().catch(console.error);
