import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { RiderProfile, RiderAvailability } from '../modules/rider/rider.model';

async function makeAllRidersAvailable() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected.');

    const result = await RiderProfile.updateMany(
      {},
      { $set: { availabilityStatus: RiderAvailability.AVAILABLE, isActive: true } }
    );

    console.log(`Updated ${result.modifiedCount} RiderProfiles to AVAILABLE status.`);
    
  } catch (error) {
    console.error('Failed to update riders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

makeAllRidersAvailable();
