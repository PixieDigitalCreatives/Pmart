const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// We can just query without full models to avoid TS compilation issues in CJS script if we want,
// or we can import the models if they are compiled, but let's just use raw mongoose schema for safety.

async function repairOrder() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const orderIdStr = 'ORD-1790696002234-211';
  console.log('Finding order:', orderIdStr);
  
  const db = mongoose.connection.db;
  const order = await db.collection('orders').findOne({ orderNumber: orderIdStr });
  
  if (!order) {
    console.log('Order not found');
    process.exit(1);
  }
  
  console.log('CURRENT ORDER STATE:');
  console.log(JSON.stringify(order, null, 2));
  
  if (order.rider) {
    console.log('Rider ID found:', order.rider);
    const rider = await db.collection('riderprofiles').findOne({ user: order.rider });
    console.log('RiderProfile:', rider);
    
    // Repair rider status
    if (rider && rider.availabilityStatus !== 'BUSY') {
      await db.collection('riderprofiles').updateOne(
        { _id: rider._id },
        { $set: { availabilityStatus: 'BUSY', currentDelivery: order._id } }
      );
      console.log('Repaired RiderProfile state to BUSY');
    }
  }

  // Repair order status
  if (order.rider && order.status !== 'ASSIGNED' && order.status !== 'OUT_FOR_DELIVERY') {
    const requiredStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED'];
    let currentTime = new Date(order.createdAt).getTime();
    
    let statusHistory = order.statusHistory || [];
    
    for (const status of requiredStatuses) {
      const exists = statusHistory.find(h => h.status === status);
      if (!exists) {
        currentTime += 60000; // +1 minute
        statusHistory.push({
          status,
          changedAt: new Date(currentTime),
          note: 'Development Data Repair'
        });
      }
    }
    
    await db.collection('orders').updateOne(
      { _id: order._id },
      { $set: { status: 'ASSIGNED', statusHistory } }
    );
    console.log('Repaired Order state to ASSIGNED with history');
  }
  
  process.exit(0);
}

repairOrder().catch(console.error);
