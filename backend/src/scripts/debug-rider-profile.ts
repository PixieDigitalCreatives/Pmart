import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../modules/auth/auth.model';
import { RiderProfile } from '../modules/rider/rider.model';
import axios from 'axios';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function debugRider() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  
  const riders = await User.find({ role: UserRole.RIDER });
  console.log(`Found ${riders.length} riders in DB.`);
  
  if (riders.length === 0) {
    console.log('No riders found.');
    process.exit(0);
  }
  
  const rider = riders[0];
  console.log('User DB Record:');
  console.log(`_id: ${rider._id}`);
  console.log(`email: ${rider.email}`);
  console.log(`role: ${rider.role}`);
  console.log(`isActive: ${rider.isActive}`);
  
  const profile = await RiderProfile.findOne({ user: rider._id });
  console.log('\nRiderProfile DB Record:');
  console.log(`found: ${!!profile}`);
  if (profile) {
    console.log(`user: ${profile.user}`);
    console.log(`profileComplete: ${profile.profileComplete}`);
  }
  
  const token = jwt.sign(
    { id: rider._id, role: rider.role, email: rider.email },
    process.env.JWT_SECRET || 'production_secret_key_change_me_in_real_prod',
    { expiresIn: '1d' }
  );
  
  console.log('\nMaking API Request to GET /api/rider/profile');
  try {
    const res = await axios.get('http://localhost:5000/api/rider/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Status: ${res.status}`);
    console.log('Response Body:', JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.log(`Status: ${error.response?.status}`);
    console.log('Response Body:', JSON.stringify(error.response?.data, null, 2));
  }
  
  process.exit(0);
}

debugRider().catch(console.error);
