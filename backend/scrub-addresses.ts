import mongoose from 'mongoose';
import { Address } from './src/modules/address/address.model';
import dotenv from 'dotenv';
dotenv.config();

async function scrubAddresses() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const addresses = await Address.find({});
  let scrubbed = 0;

  for (const addr of addresses) {
    let updated = false;
    
    // Check for fake names
    if (addr.recipientName === 'Sector 143 Resident' || addr.recipientName === 'John Doe') {
      // Find the user and set their real name
      const { User } = require('./src/modules/auth/auth.model');
      const user = await User.findById(addr.user);
      if (user) {
        addr.recipientName = user.fullName || user.name || 'Customer';
      } else {
        addr.recipientName = 'Customer';
      }
      updated = true;
    }

    // Check for fake phone numbers
    if (addr.recipientPhone === '9876543210' || addr.recipientPhone === '9999999999') {
      const { User } = require('./src/modules/auth/auth.model');
      const user = await User.findById(addr.user);
      if (user && user.phone) {
        addr.recipientPhone = user.phone;
      }
      updated = true;
    }

    if (updated) {
      await addr.save();
      scrubbed++;
      console.log(`Scrubbed fake data from address ${addr._id}`);
    }
  }

  console.log(`Scrubbed ${scrubbed} addresses.`);
  process.exit(0);
}

scrubAddresses().catch(console.error);
