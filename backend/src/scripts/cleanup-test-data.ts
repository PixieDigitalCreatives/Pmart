import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting cleanup... ${isDryRun ? '(DRY RUN)' : '(REAL EXECUTION)'}`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pmart');
  console.log('Connected to MongoDB');

  const { Order } = require('../modules/order/order.model');
  const { User } = require('../modules/auth/auth.model');
  const { RiderProfile, RiderLocation } = require('../modules/rider/rider.model');
  const { Shop } = require('../modules/shop/shop.model');
  const { Product } = require('../modules/catalog/catalog.model');
  const { CustomerProfile } = require('../modules/users/user.model');
  const { Cart } = require('../modules/cart/cart.model');

  const recordsToRemove: { collection: string; _id: string; reason: string }[] = [];

  // 1. Orders
  const orders = await Order.find();
  for (const order of orders) {
    if (
      order.deliveryAddress?.street === '123 Test St' || 
      order.deliveryAddress?.city === 'Testville' ||
      order.items?.some((i: any) => i.name.includes('Test Product') || i.name.includes('E2E')) ||
      order.shop?.toString() === '6abe55d88c461dccc1ae928c' || 
      order.orderNumber.includes('E2E')
    ) {
      recordsToRemove.push({ collection: 'orders', _id: order._id.toString(), reason: 'E2E/Test dummy order match' });
      if (!isDryRun) await Order.deleteOne({ _id: order._id });
    } else {
      // Orphan shop check
      if (order.shop) {
        const shopExists = await Shop.findById(order.shop);
        if (!shopExists) {
          recordsToRemove.push({ collection: 'orders', _id: order._id.toString(), reason: `Orphaned shop reference: ${order.shop}` });
          if (!isDryRun) await Order.deleteOne({ _id: order._id });
        }
      }
    }
  }

  // 2. Users (Test users)
  const users = await User.find({
    $or: [
      { name: { $in: ['Rider Test (Available)', 'Rider Test (Busy)', 'E2E Rider', 'E2E Customer', 'E2E Admin', 'Test Shop Owner', 'Rider Test'] } },
      { email: { $regex: /@example\.com$/i } },
      { email: { $regex: /e2e.*@/i } },
      { phone: { $regex: /^\+1000/ } }
    ]
  });

  for (const user of users) {
    recordsToRemove.push({ collection: 'users', _id: user._id.toString(), reason: `Matched test user pattern: ${user.name || user.email || user.phone}` });
    if (!isDryRun) await User.deleteOne({ _id: user._id });
  }

  // 3. RiderProfiles
  const riderProfiles = await RiderProfile.find({
    $or: [
      { fullName: { $in: ['Rider Test (Available)', 'Rider Test (Busy)', 'E2E Rider', 'Rider Test'] } },
      { phone: { $regex: /^\+1000/ } }
    ]
  });
  
  for (const profile of riderProfiles) {
    recordsToRemove.push({ collection: 'riderprofiles', _id: profile._id.toString(), reason: `Matched test rider profile: ${profile.fullName}` });
    if (!isDryRun) await RiderProfile.deleteOne({ _id: profile._id });
  }

  // 4. Products
  const products = await Product.find({
    $or: [
      { name: { $regex: /Test Product/i } },
      { name: { $regex: /E2E Test/i } }
    ]
  });
  for (const product of products) {
    recordsToRemove.push({ collection: 'products', _id: product._id.toString(), reason: `Matched test product: ${product.name}` });
    if (!isDryRun) await Product.deleteOne({ _id: product._id });
  }

  // 5. Shops
  const shops = await Shop.find({
    name: { $regex: /E2E Test Shop/i }
  });
  for (const shop of shops) {
    recordsToRemove.push({ collection: 'shops', _id: shop._id.toString(), reason: `Matched test shop: ${shop.name}` });
    if (!isDryRun) await Shop.deleteOne({ _id: shop._id });
  }

  console.log('--- CLEANUP REPORT ---');
  if (recordsToRemove.length === 0) {
    console.log('No test records found.');
  } else {
    recordsToRemove.forEach(r => {
      console.log(`[${r.collection.toUpperCase()}] ID: ${r._id} | REASON: ${r.reason}`);
    });
    console.log(`Total records matched: ${recordsToRemove.length}`);
  }

  if (isDryRun) {
    console.log('\nThis was a DRY RUN. No records were deleted.');
  } else {
    console.log('\nRecords successfully deleted.');
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
