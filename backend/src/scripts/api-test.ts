import axios from 'axios';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../modules/auth/auth.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://pmart:Pmart%402026@pmart.sdws2dd.mongodb.net/pmart?retryWrites=true&w=majority&appName=pmart');
  
  const riders = await User.find({ role: UserRole.RIDER });
  if (riders.length === 0) {
    console.log('No riders found.');
    process.exit(0);
  }
  
  const rider = riders[0];
  const token = jwt.sign(
    { id: rider._id, role: rider.role, email: rider.email },
    process.env.JWT_SECRET || 'production_secret_key_change_me_in_real_prod',
    { expiresIn: '1d' }
  );

  console.log(`Generated token for rider ${rider.email}`);

  try {
    const response = await axios.get('http://localhost:5000/api/rider/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('[API Success] Status:', response.status);
    console.log('[API Response Data]:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('[API Error] Status:', error.response?.status);
    console.log('[API Error Data]:', error.response?.data);
  }

  process.exit(0);
}

run().catch(console.error);
