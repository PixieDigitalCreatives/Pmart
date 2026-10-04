import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Order, OrderStatus, OrderEvent } from './src/modules/order/order.model';
import { RiderProfile, RiderAvailability } from './src/modules/rider/rider.model';
import dotenv from 'dotenv';
dotenv.config();

async function testPickup() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to DB");
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = '6abbda42e6ab1795072db7ce';
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error("Order not found");
    
    // We assume the rider user ID is the one from the order.rider
    const riderUserId = order.rider;
    console.log("Rider user ID:", riderUserId);

    if (!order.rider || order.rider.toString() !== (riderUserId as any).toString()) {
      throw new Error("Not assigned");
    }

    const otp = crypto.randomInt(1000, 10000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    order.status = OrderStatus.OUT_FOR_DELIVERY; 
    order.rider = riderUserId; 
    order.deliveryOtp = otp; 
    order.deliveryOtpHash = otpHash;
    order.deliveryOtpExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24); 
    order.deliveryOtpAttempts = 0;
    order.deliveryVerificationStatus = 'PENDING';
    order.tracking = {
      location: { lat: 0, lng: 0 },
      updatedAt: new Date()
    };
    (order as any).pickedUpAt = new Date();
    (order as any).outForDeliveryAt = new Date();

    order.statusHistory.push({
      status: OrderStatus.PICKED_UP,
      changedAt: new Date(),
      changedBy: riderUserId
    });
    order.statusHistory.push({
      status: OrderStatus.OUT_FOR_DELIVERY,
      changedAt: new Date(),
      changedBy: riderUserId
    });

    await order.save({ session });
    console.log("Order saved");

    const riderUpdateResult = await RiderProfile.updateOne(
      { user: riderUserId }, 
      { availabilityStatus: RiderAvailability.BUSY, currentDelivery: order._id },
      { session }
    );
    console.log("RiderProfile update:", riderUpdateResult);

    const pickedUpEvent = new OrderEvent({
      order: order._id,
      status: OrderStatus.PICKED_UP,
      notes: 'Rider picked up order',
      triggeredBy: riderUserId
    });
    await pickedUpEvent.save({ session });
    console.log("Event 1 saved");

    const outForDeliveryEvent = new OrderEvent({
      order: order._id,
      status: OrderStatus.OUT_FOR_DELIVERY,
      notes: 'Order is out for delivery',
      triggeredBy: riderUserId
    });
    await outForDeliveryEvent.save({ session });
    console.log("Event 2 saved");

    await session.commitTransaction();
    console.log("Success!");
  } catch (error) {
    await session.abortTransaction();
    console.error("Error:", error);
  } finally {
    session.endSession();
    process.exit(0);
  }
}

testPickup();
