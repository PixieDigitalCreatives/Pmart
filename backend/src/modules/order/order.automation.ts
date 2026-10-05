import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Order, OrderStatus, OrderEvent } from './order.model';
import { RiderProfile, RiderAvailability } from '../rider/rider.model';
import { env } from '../../config/env';
import { getIO } from '../../config/socket';
import { encryptOtp } from '../../utils/encryption';

export class OrderAutomation {
  static async scheduleRiderProgression(orderId: string | mongoose.Types.ObjectId, riderId: string | mongoose.Types.ObjectId) {
    if (env.RIDER_PICKUP_DELAY_MS) {
      setTimeout(() => {
        this.processPickup(orderId, riderId).catch(err => console.error('Auto-pickup failed:', err));
      }, env.RIDER_PICKUP_DELAY_MS);
    }
  }

  static async processPickup(orderId: string | mongoose.Types.ObjectId, riderId: string | mongoose.Types.ObjectId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Verify current status is ASSIGNED atomically
      const order = await Order.findOne({ _id: orderId, status: OrderStatus.ASSIGNED }).session(session);
      if (!order) {
        await session.abortTransaction();
        return; // Either not found or already progressed
      }

      // Transition to PICKED_UP
      order.status = OrderStatus.PICKED_UP;
      (order as any).pickedUpAt = new Date();
      order.statusHistory.push({
        status: OrderStatus.PICKED_UP,
        changedAt: new Date(),
        changedBy: riderId as any,
        actorRole: 'SYSTEM',
        note: 'Automatic rider pickup'
      });

      await order.save({ session });

      const event = new OrderEvent({
        order: order._id,
        status: OrderStatus.PICKED_UP,
        notes: 'Order automatically picked up by rider',
        triggeredBy: riderId as any // Attribution to rider for automation
      });
      await event.save({ session });

      await session.commitTransaction();

      // Emit socket event
      try {
        const io = getIO();
        io.to(`order_${order._id}`).emit('order:status:update', {
          orderId: order._id,
          status: OrderStatus.PICKED_UP,
          timestamp: new Date()
        });
        io.to(`rider_${riderId}`).emit('order_status_update', {
          orderId: order._id,
          status: OrderStatus.PICKED_UP,
        });
        io.to('admin_deliveries').emit('order_status_update', {
          orderId: order._id,
          status: OrderStatus.PICKED_UP,
        });
      } catch (e) {
        console.error('Socket emission failed in processPickup:', e);
      }

      // Schedule next phase
      if (env.RIDER_OUT_FOR_DELIVERY_DELAY_MS) {
        setTimeout(() => {
          this.processOutForDelivery(orderId, riderId).catch(err => console.error('Auto-out-for-delivery failed:', err));
        }, env.RIDER_OUT_FOR_DELIVERY_DELAY_MS);
      }

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async processOutForDelivery(orderId: string | mongoose.Types.ObjectId, riderId: string | mongoose.Types.ObjectId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Verify current status is PICKED_UP atomically
      const order = await Order.findOne({ _id: orderId, status: OrderStatus.PICKED_UP }).session(session);
      if (!order) {
        await session.abortTransaction();
        return; // Either not found or already progressed
      }

      // Generate 4-digit OTP securely using the authoritative OTP Service
      if (!order.encryptedOtp || !order.deliveryOtpHash) {
        try {
          const { OtpService } = require('./otp.service');
          await OtpService.generateUniqueDeliveryOtp(order._id, session);
          // Reload order since OtpService saves the hash/encrypted properties
          const updated = await Order.findById(order._id).session(session).select('+encryptedOtp +deliveryOtpHash');
          if (updated) {
            order.encryptedOtp = updated.encryptedOtp;
            order.deliveryOtpHash = updated.deliveryOtpHash;
            order.deliveryOtpExpiry = updated.deliveryOtpExpiry;
            order.deliveryOtpAttempts = updated.deliveryOtpAttempts;
            order.deliveryVerificationStatus = updated.deliveryVerificationStatus;
          }
        } catch (e) {
          console.error('Failed to generate unique OTP:', e);
          // If it fails, we shouldn't proceed to out for delivery without OTP
          await session.abortTransaction();
          return;
        }
      }

      order.status = OrderStatus.OUT_FOR_DELIVERY;
      (order as any).outForDeliveryAt = new Date();

      order.statusHistory.push({
        status: OrderStatus.OUT_FOR_DELIVERY,
        changedAt: new Date(),
        changedBy: riderId as any,
        actorRole: 'SYSTEM',
        note: 'Automatic rider out for delivery'
      });

      await order.save({ session });

      const event = new OrderEvent({
        order: order._id,
        status: OrderStatus.OUT_FOR_DELIVERY,
        notes: 'Order automatically out for delivery',
        triggeredBy: riderId as any
      });
      await event.save({ session });

      try {
        await session.commitTransaction();
      } catch (commitErr) {
        console.error('commitTransaction threw error:', commitErr);
        throw commitErr;
      }

      // Emit socket event
      try {
        const io = getIO();
        io.to(`order_${order._id}`).emit('order:status:update', {
          orderId: order._id,
          status: OrderStatus.OUT_FOR_DELIVERY,
          otpAvailable: true,
          timestamp: new Date()
        });
        io.to(`rider_${riderId}`).emit('order_status_update', {
          orderId: order._id,
          status: OrderStatus.OUT_FOR_DELIVERY,
        });
        io.to('admin_deliveries').emit('order_status_update', {
          orderId: order._id,
          status: OrderStatus.OUT_FOR_DELIVERY,
        });
      } catch (e) {
        console.error('Socket emission failed in processOutForDelivery:', e);
      }

    } catch (error) {
      console.error('Original error in processOutForDelivery:', error);
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error('abortTransaction threw error:', abortErr);
      }
      throw error;
    } finally {
      session.endSession();
    }
  }
}
