import mongoose from 'mongoose';
import { User, UserRole } from '../src/modules/auth/auth.model';
import { RiderProfile } from '../src/modules/rider/rider.model';

mongoose.connect('mongodb://localhost:27017/pmart').then(async () => {
  const users = await User.find({ role: UserRole.RIDER });
  console.log('RIDER USERS:');
  console.log(JSON.stringify(users, null, 2));

  const profiles = await RiderProfile.find({});
  console.log('\nRIDER PROFILES:');
  console.log(JSON.stringify(profiles, null, 2));

  process.exit(0);
});
