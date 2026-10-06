import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Order, OrderStatus, OrderEvent } from './order.model';
import { RiderProfile, RiderAvailability } from '../rider/rider.model';
import { env } from '../../config/env';
import { getIO } from '../../config/socket';
import { encryptOtp } from '../../utils/encryption';
import { OrderProgressionJob, ProgressionJobType, ProgressionJobStatus } from './order.progression.model';

export class OrderAutomation {
  private static sweeperInterval: NodeJS.Timeout | null = null;
  private static pendingTimeouts: Set<NodeJS.Timeout> = new Set();

  static async scheduleRiderProgression(orderId: string | mongoose.Types.ObjectId, riderId: string | mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
    if (env.RIDER_PICKUP_DELAY_MS && process.env.NODE_ENV !== 'production') {
      const executeAt = new Date(Date.now() + env.RIDER_PICKUP_DELAY_MS);
      const job = new OrderProgressionJob({
        order: orderId,
        rider: riderId,
        type: ProgressionJobType.PICKUP,
        status: ProgressionJobStatus.PENDING,
        executeAt
      });

      if (session) {
        await job.save({ session });
      } else {
        await job.save();
      }

      // Fast-path execution
      const timeoutId = setTimeout(() => {
        this.pendingTimeouts.delete(timeoutId);
        this.executeJob(job._id as mongoose.Types.ObjectId).catch(err => {
          if (process.env.NODE_ENV !== 'test') console.error('Auto-pickup fast-path failed:', err);
        });
      }, env.RIDER_PICKUP_DELAY_MS);
      this.pendingTimeouts.add(timeoutId);
      timeoutId.unref();
    }
  }

  static async executeJob(jobId: mongoose.Types.ObjectId) {
    const job = await OrderProgressionJob.findOneAndUpdate(
      { _id: jobId, status: ProgressionJobStatus.PENDING },
      { $set: { status: ProgressionJobStatus.PROCESSING, lockedAt: new Date() } },
      { new: true }
    );
    
    if (!job) return; // Already picked up by another worker or completed/failed

    try {
      if (job.type === ProgressionJobType.PICKUP) {
        await this.processPickup(job.order, job.rider);
      } else if (job.type === ProgressionJobType.OUT_FOR_DELIVERY) {
        await this.processOutForDelivery(job.order, job.rider);
      }
      
      job.status = ProgressionJobStatus.COMPLETED;
      await job.save();
    } catch (err: any) {
      job.attempts += 1;
      job.lastError = err.message;
      if (job.attempts >= 3) {
        job.status = ProgressionJobStatus.FAILED;
      } else {
        job.status = ProgressionJobStatus.PENDING;
      }
      await job.save();
    }
  }

  static startRecoverySweeper() {
    if (this.sweeperInterval) return;
    
    // Sweeper polls jobs table every 5 seconds to pick up any missed jobs (e.g. from restarts)
    this.sweeperInterval = setInterval(async () => {
      try {
        const jobs = await OrderProgressionJob.find({
          status: ProgressionJobStatus.PENDING,
          executeAt: { $lte: new Date() }
        }).limit(50);
        
        for (const job of jobs) {
           this.executeJob(job._id as mongoose.Types.ObjectId).catch(e => {
              if (process.env.NODE_ENV !== 'test') console.error('Error in executeJob:', e);
           });
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error('Rider progression recovery sweeper failed:', err);
      }
    }, process.env.NODE_ENV === 'test' ? 100 : 5000); // Poll every 5 seconds (100ms in test)
    
    if (this.sweeperInterval) {
      this.sweeperInterval.unref();
    }
  }
  
  static stopRecoverySweeper() {
    if (this.sweeperInterval) {
      clearInterval(this.sweeperInterval);
      this.sweeperInterval = null;
    }
    
    // Also clear all pending fast-path timeouts
    for (const timeoutId of this.pendingTimeouts) {
      clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
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

      // Don't commit yet, we need to save the next job in the same transaction

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
        if (process.env.NODE_ENV !== 'test') {
          console.error('Socket emission failed in processPickup:', e);
        }
      }

      // Schedule next phase
      if (env.RIDER_OUT_FOR_DELIVERY_DELAY_MS && process.env.NODE_ENV !== 'production') {
        const executeAt = new Date(Date.now() + env.RIDER_OUT_FOR_DELIVERY_DELAY_MS);
        const nextJob = new OrderProgressionJob({
          order: orderId,
          rider: riderId,
          type: ProgressionJobType.OUT_FOR_DELIVERY,
          status: ProgressionJobStatus.PENDING,
          executeAt
        });
        await nextJob.save({ session });
        
        await session.commitTransaction();
        
        // Fast-path execution
        const timeoutId = setTimeout(() => {
          this.pendingTimeouts.delete(timeoutId);
          this.executeJob(nextJob._id as mongoose.Types.ObjectId).catch(err => {
            if (process.env.NODE_ENV !== 'test') console.error('Auto-out-for-delivery fast-path failed:', err);
          });
        }, env.RIDER_OUT_FOR_DELIVERY_DELAY_MS);
        this.pendingTimeouts.add(timeoutId);
        timeoutId.unref();
      } else {
        await session.commitTransaction();
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
        if (process.env.NODE_ENV !== 'test') {
          console.error('Socket emission failed in processOutForDelivery:', e);
        }
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
