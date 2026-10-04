import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { RiderProfile } from '../src/modules/rider/rider.model';

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  
  // Directly simulate the endpoint logic
  const profiles = await RiderProfile.find({ isActive: true, availabilityStatus: 'AVAILABLE' }).populate('user', 'name phone email isActive');
  const eligible = profiles.filter(p => (p.user as any)?.isActive).map(p => ({
    name: (p.user as any).name,
    status: p.availabilityStatus
  }));

  console.log('Eligible Riders Endpoint returns:');
  console.log(JSON.stringify(eligible, null, 2));

  // See if there are any busy riders to prove they exist but are filtered out
  const busyProfiles = await RiderProfile.find({ isActive: true, availabilityStatus: 'BUSY' }).populate('user', 'name phone email isActive');
  console.log('\nBusy Riders in DB:');
  console.log(busyProfiles.map(p => p.availabilityStatus));

  process.exit(0);
}

run();
