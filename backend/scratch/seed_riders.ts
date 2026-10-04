import mongoose from 'mongoose';
import { env } from '../src/config/env';

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to DB');
  const RiderProfile = mongoose.connection.collection('riderprofiles');
  await RiderProfile.deleteMany({});
  
  const availUser = new mongoose.Types.ObjectId();
  const busyUser = new mongoose.Types.ObjectId();
  
  const User = mongoose.connection.collection('users');
  await User.insertMany([
    { _id: availUser, name: 'Available Rider User', role: 'RIDER', email: 'avail@test.com', isActive: true },
    { _id: busyUser, name: 'Busy Rider User', role: 'RIDER', email: 'busy@test.com', isActive: true }
  ]);

  await RiderProfile.insertMany([
    {
      user: availUser,
      fullName: 'Rider Test (Available)',
      vehicleType: 'BIKE',
      vehicleNumber: 'TEST-1234',
      licenseNumber: 'TEST-1234',
      availabilityStatus: 'AVAILABLE',
      isActive: true
    },
    {
      user: busyUser,
      fullName: 'Rider Test (Busy)',
      vehicleType: 'BIKE',
      vehicleNumber: 'TEST-BUSY',
      licenseNumber: 'TEST-BUSY',
      availabilityStatus: 'BUSY',
      isActive: true
    }
  ]);
  
  const Order = mongoose.connection.collection('orders');
  await Order.insertOne({
    orderNumber: 'TEST-123',
    customer: new mongoose.Types.ObjectId(),
    status: 'READY',
    totalAmount: 100,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Seeded');
  process.exit(0);
}

run();
