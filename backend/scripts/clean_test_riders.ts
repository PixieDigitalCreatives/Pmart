import mongoose from 'mongoose';
import { User, UserRole } from '../src/modules/auth/auth.model';
import { RiderProfile } from '../src/modules/rider/rider.model';

import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pmart');
  
  // 1. Delete specific test users
  const testNames = ['TEst', 'Rider', 'Available Rider User', 'Busy Rider User', 'E2E Rider', 'Test Rider', 'Rider User'];
  const testUsers = await User.find({ role: UserRole.RIDER, name: { $in: testNames } });
  console.log(`Found ${testUsers.length} test users to delete.`);
  
  for (const tu of testUsers) {
    console.log(`Deleting test user ${tu.name} (${tu.email}) and its profile.`);
    await RiderProfile.deleteMany({ user: tu._id });
    await User.findByIdAndDelete(tu._id);
  }

  // 2. Find invalid rider profiles (user is null or invalid)
  const allProfiles = await RiderProfile.find({});
  let invalidProfiles = 0;
  for (const p of allProfiles) {
    if (!p.user) {
      console.log(`Deleting RiderProfile with no user. ID: ${p._id}`);
      await RiderProfile.findByIdAndDelete(p._id);
      invalidProfiles++;
      continue;
    }
    const u = await User.findById(p.user);
    if (!u) {
      console.log(`Deleting RiderProfile with orphaned user ${p.user}. ID: ${p._id}`);
      await RiderProfile.findByIdAndDelete(p._id);
      invalidProfiles++;
    }
  }

  // 3. Find invalid users (role RIDER but no profile)
  const allRiderUsers = await User.find({ role: UserRole.RIDER });
  for (const r of allRiderUsers) {
    const p = await RiderProfile.findOne({ user: r._id });
    if (!p) {
       console.log(`Deleting RIDER user with no RiderProfile. ID: ${r._id}, Name: ${r.name}`);
       await User.findByIdAndDelete(r._id);
    }
  }

  console.log(`Cleaned up ${testUsers.length} test users and ${invalidProfiles} invalid profiles.`);
  process.exit(0);
}
main().catch(console.error);
