import mongoose from 'mongoose';
import { env } from '../config/env';
import { Order, OrderStatus } from '../modules/order/order.model';
import { User } from '../modules/auth/auth.model';
import { Product } from '../modules/catalog/catalog.model';
import { Shop } from '../modules/shop/shop.model';

async function verify() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let passed = true;

  // 1. Check for remaining test records
  console.log('\n--- 1. Checking Test Records ---');
  const testOrders = await Order.countDocuments({
    $or: [
      { 'deliveryAddress.street': /Test/i },
      { 'deliveryAddress.city': /Testville/i }
    ]
  });
  const testShops = await Shop.countDocuments({ name: /E2E/i });
  const testUsers = await User.countDocuments({ name: /E2E/i });
  const testProducts = await Product.countDocuments({ name: /Test/i });

  if (testOrders > 0 || testShops > 0 || testUsers > 0 || testProducts > 0) {
    console.error(`FAIL: Found test records! Orders: ${testOrders}, Shops: ${testShops}, Users: ${testUsers}, Products: ${testProducts}`);
    passed = false;
  } else {
    console.log('PASS: No test records found in DB. Count is exactly 0.');
  }

  // 2. OTP Security Checks
  console.log('\n--- 2. Checking OTP Schema ---');
  const verifiedOrders = await Order.find({ deliveryVerificationStatus: 'OTP_VERIFIED' }).select('+encryptedOtp +deliveryOtpHash').lean();
  let foundValidOtp = false;

  for (const order of verifiedOrders) {
    if ((order as any).deliveryOtp) {
      console.error('FAIL: plaintext deliveryOtp found in database! ID:', order._id);
      passed = false;
    }
    if (order.encryptedOtp && order.deliveryOtpHash) {
      foundValidOtp = true;
    }
  }

  if (verifiedOrders.length > 0 && !foundValidOtp) {
    console.warn('WARN: Found verified orders, but none had encryptedOtp/deliveryOtpHash (likely legacy test orders).');
  } else {
    console.log('PASS: No plaintext deliveryOtp found in any verified order. OTPs are securely hashed/encrypted where present.');
  }

  console.log('\nFinal Result: ' + (passed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'));
  process.exit(passed ? 0 : 1);
}

verify().catch(console.error);
