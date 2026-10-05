import mongoose from 'mongoose';
import { User, UserRole } from '../modules/auth/auth.model';
import { Shop } from '../modules/shop/shop.model';
import { Category, Product } from '../modules/catalog/catalog.model';
import { CustomerProfile } from '../modules/users/user.model';
import { RiderProfile } from '../modules/rider/rider.model';
import { Order, OrderStatus } from '../modules/order/order.model';

import dotenv from 'dotenv';
dotenv.config();

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmart');
  console.log('Connected to REAL DB for Manual Seeding');
  
  // Wipe DB to avoid duplicate unique key errors (phone/slugs)
  // DESTRUCTIVE BEHAVIOR REMOVED: await mongoose.connection.dropDatabase();

  // Admin
  const admin = await User.findOneAndUpdate({ phone: '+916666666666' }, { role: UserRole.ADMIN, isActive: true }, { upsert: true, new: true });

  // Customer
  const customer = await User.findOneAndUpdate({ phone: '+919999999999' }, { role: UserRole.CUSTOMER, isActive: true }, { upsert: true, new: true });
  await CustomerProfile.findOneAndUpdate(
    { user: customer._id },
    { fullName: 'Test Customer', addresses: [{ label: 'Home', street: '123 Main St', city: 'Sasaram', state: 'Bihar', pincode: '821115', coordinates: { lat: 24.95, lng: 84.02 } }] },
    { upsert: true }
  );

  // Rider
  const rider = await User.findOneAndUpdate({ phone: '+918888888888' }, { role: UserRole.RIDER, isActive: true }, { upsert: true, new: true });
  await RiderProfile.findOneAndUpdate(
    { user: rider._id },
    { fullName: 'Test Rider', vehicleType: 'Bike', vehicleNumber: 'BR 24 AX 4492', licenseNumber: 'LIC-123' },
    { upsert: true }
  );

  // Shop Owner
  const shopOwner = await User.findOneAndUpdate({ phone: '+917777777777' }, { role: UserRole.SHOP_OWNER, isActive: true }, { upsert: true, new: true });
  const shop = await Shop.findOneAndUpdate(
    { owner: shopOwner._id },
    { name: 'P Mart Sasaram', address: { street: 'Panjar Colony', city: 'Sasaram', state: 'Bihar', pincode: '821115', coordinates: { lat: 24.9588, lng: 84.0155 } }, openTime: '08:00', closeTime: '22:00' },
    { upsert: true, new: true }
  );

  // Category & Product
  const category = await Category.findOneAndUpdate({ slug: 'groceries' }, { name: 'Groceries' }, { upsert: true, new: true });
  const product = await Product.findOneAndUpdate(
    { slug: 'aashirvaad-atta-5kg' },
    { shop: shop._id, category: category._id, categorySlug: 'groceries', name: 'Aashirvaad Atta 5kg', description: 'Whole wheat atta', price: 250, stockQuantity: 100, sku: 'SKU-ATTA-5', unit: '5kg' },
    { upsert: true, new: true }
  );

  // Order
  const order = await Order.findOneAndUpdate(
    { orderNumber: 'ORD-TEST-123' },
    { customer: customer._id, shop: shop._id, rider: rider._id, items: [{ product: product._id, name: product.name, price: product.price, quantity: 1 }], subTotal: 250, deliveryFee: 10, totalAmount: 260, status: OrderStatus.OUT_FOR_DELIVERY, deliveryAddress: { street: '123 Main St', city: 'Sasaram', state: 'Bihar', pincode: '821115', coordinates: { lat: 24.95, lng: 84.02 } }, paymentMethod: 'COD', paymentStatus: 'PENDING', deliveryOtpHash: 'hashedotp', deliveryOtpAttempts: 0 },
    { upsert: true, new: true }
  );

  console.log('Setup complete!');
  process.exit(0);
}
setup().catch(console.error);
