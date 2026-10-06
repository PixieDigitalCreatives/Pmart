/**
 * @deprecated — This script is superseded by normalize-addresses.ts.
 * It uses raw $rename operations without validation, conflict detection,
 * or dry-run mode. Retained for reference until the replacement has been
 * reviewed and tested. Do NOT run this against production data.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    // 1. Migrate Shops
    const shops = mongoose.connection.collection('shops');
    const shopResult = await shops.updateMany(
      { "address.zipCode": { $exists: true } },
      { $rename: { "address.zipCode": "address.pincode" } }
    );
    console.log(`Migrated ${shopResult.modifiedCount} shops.`);

    // 2. Migrate Orders
    const orders = mongoose.connection.collection('orders');
    const orderResult = await orders.updateMany(
      { "deliveryAddress.zipCode": { $exists: true } },
      { $rename: { "deliveryAddress.zipCode": "deliveryAddress.pincode" } }
    );
    console.log(`Migrated ${orderResult.modifiedCount} orders.`);

    // 3. Migrate CustomerProfiles
    const profiles = mongoose.connection.collection('customerprofiles');
    const allProfiles = await profiles.find({ "addresses.zipCode": { $exists: true } }).toArray();
    
    let profileCount = 0;
    for (const profile of allProfiles) {
      const newAddresses = profile.addresses.map((a: any) => {
        if (a.zipCode) {
          a.pincode = a.zipCode;
          delete a.zipCode;
        }
        return a;
      });
      await profiles.updateOne(
        { _id: profile._id },
        { $set: { addresses: newAddresses } }
      );
      profileCount++;
    }
    console.log(`Migrated ${profileCount} customer profiles.`);

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

migrate();
