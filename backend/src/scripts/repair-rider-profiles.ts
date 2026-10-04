import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User, UserRole } from '../modules/auth/auth.model';
import { RiderProfile } from '../modules/rider/rider.model';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const isDryRun = process.argv.includes('--dry-run');

async function runRepair() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://pmart:Pmart%402026@pmart.sdws2dd.mongodb.net/pmart?retryWrites=true&w=majority&appName=pmart');

  console.log(`--- RIDER REPAIR ${isDryRun ? '(DRY RUN)' : '(LIVE)'} ---`);
  
  const riders = await User.find({ role: UserRole.RIDER }).lean();
  let repairedCount = 0;

  for (const rider of riders) {
    const profile = await RiderProfile.findOne({ user: rider._id }).lean();
    
    if (!profile) {
      console.log(`\nFound RIDER without profile: User ID ${rider._id} (${rider.email || 'N/A'})`);
      
      if (!isDryRun) {
        try {
          const newProfile = new RiderProfile({
            user: rider._id,
            fullName: rider.name || '',
            phone: rider.phone || '',
            profileComplete: false,
            availabilityStatus: 'OFFLINE'
          });
          
          await newProfile.save();
          // Ensure user reflects profileComplete = false
          await User.updateOne({ _id: rider._id }, { profileComplete: false });
          
          console.log(`✅ REPAIRED: Created RiderProfile for User ${rider._id}`);
          repairedCount++;
        } catch (error: any) {
          console.error(`❌ FAILED to repair User ${rider._id}: ${error.message}`);
        }
      } else {
        console.log(`⚠️ WOULD REPAIR: Create RiderProfile for User ${rider._id}`);
        repairedCount++;
      }
    }
  }

  console.log('\n--- REPAIR SUMMARY ---');
  console.log(`Total missing profiles ${isDryRun ? 'that would be ' : ''}repaired: ${repairedCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

runRepair().catch(console.error);
