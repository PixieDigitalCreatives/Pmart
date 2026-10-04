import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  if (process.env.NODE_ENV === 'production' || process.env.VITE_API_URL?.includes('pmart')) {
    console.error('ERROR: setup-e2e.ts cannot be run in production.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('Connected to DB');

  const User = mongoose.connection.collection('users');
  const RiderProfile = mongoose.connection.collection('riderprofiles');
  const Product = mongoose.connection.collection('products');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Admin
  let admin = await User.findOne({ email: 'admin@e2e.com' });
  if (!admin) {
    const res = await User.insertOne({
      name: 'E2E Admin', phone: '+10000000001', email: 'admin@e2e.com', password: passwordHash, role: 'ADMIN', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    admin = { _id: res.insertedId };
  } else {
    await User.updateOne({ email: 'admin@e2e.com' }, { $set: { phone: '+10000000001' } });
  }

  // 2. Create Customer
  let customer = await User.findOne({ email: 'customer@e2e.com' });
  if (!customer) {
    const res = await User.insertOne({
      name: 'E2E Customer', phone: '+10000000002', email: 'customer@e2e.com', password: passwordHash, role: 'CUSTOMER', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    customer = { _id: res.insertedId };
  } else {
    await User.updateOne({ email: 'customer@e2e.com' }, { $set: { phone: '+10000000002' } });
  }

  const Address = mongoose.connection.collection('addresses');
  let addr = await Address.findOne({ user: customer._id });
  if (!addr) {
    await Address.insertOne({
      user: customer._id,
      recipientName: 'E2E Customer',
      recipientPhone: '+10000000002',
      houseNumber: '101 E2E Block',
      street: 'Test Street',
      landmark: 'Near Testville Park',
      pincode: '821115',
      city: 'Testville',
      state: 'TestState',
      country: 'India',
      location: { type: 'Point', coordinates: [84.02, 24.95] },
      isDefault: true,
      isActive: true,
      label: 'HOME',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } else {
    await Address.updateOne(
      { user: customer._id },
      { $set: { 
          recipientName: 'E2E Customer',
          recipientPhone: '+10000000002',
          houseNumber: '101 E2E Block',
          street: 'Test Street',
          isDefault: true,
          isActive: true
        } 
      }
    );
  }

  // Clear existing cart to prevent E2E timeout on ADD button
  const Cart = mongoose.connection.collection('carts');
  await Cart.deleteOne({ user: customer._id });

  // 3. Create Rider
  let rider = await User.findOne({ email: 'rider@e2e.com' });
  if (!rider) {
    const res = await User.insertOne({
      name: 'E2E Rider', phone: '+10000000003', email: 'rider@e2e.com', password: passwordHash, role: 'RIDER', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    rider = { _id: res.insertedId };
    
    await RiderProfile.insertOne({
      user: rider._id,
      fullName: 'E2E Rider',
      phone: '+10000000003',
      vehicleType: 'BIKE',
      vehicleNumber: 'E2E-123',
      licenseNumber: 'E2E-LIC',
      availabilityStatus: 'AVAILABLE',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } else {
    // Ensure rider profile exists and is AVAILABLE for the test
    await RiderProfile.updateOne(
      { user: rider._id },
      { 
        $set: { 
          availabilityStatus: 'AVAILABLE', 
          isActive: true,
          fullName: 'E2E Rider',
          phone: '+10000000003',
          vehicleType: 'BIKE',
          vehicleNumber: 'E2E-123',
          licenseNumber: 'E2E-LIC'
        } 
      },
      { upsert: true }
    );
  }
  
  // 3.5 Create Shop
  const Shop = mongoose.connection.collection('shops');
  let shop = await Shop.findOne({ name: 'E2E Test Shop' });
  if (!shop) {
    const res = await Shop.insertOne({
      name: 'E2E Test Shop',
      owner: admin._id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    shop = { _id: res.insertedId };
  }

  // 4. Create Product if none exists
  let product = await Product.findOne({ name: 'E2E Test Product' });
  if (!product) {
    await Product.insertOne({
      name: 'E2E Test Product',
      slug: 'e2e-test-product',
      description: 'Test product for E2E flow',
      price: 150,
      stockCount: 100,
      inStock: true,
      categorySlug: 'electronics',
      isActive: true,
      image: 'https://example.com/test.jpg',
      shop: shop._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } else {
    await Product.updateOne(
      { name: 'E2E Test Product' }, 
      { $set: { stockCount: 100, inStock: true, isActive: true, shop: shop._id } }
    );
  }

  console.log('Idempotent E2E data setup complete');
  process.exit(0);
}

run();
