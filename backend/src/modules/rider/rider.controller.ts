import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Order, OrderStatus, OrderEvent } from '../order/order.model';
import { UserRole } from '../auth/auth.model';
import { RiderProfile, RiderAvailability, RiderLocation } from './rider.model';

export class RiderController {
  static async pickupOrder(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!req.user || req.user.role !== UserRole.RIDER) {
        await session.abortTransaction();
        return res.status(401).json({ message: 'Not authorized as rider' });
      }

      const order = await Order.findById(req.params.id).session(session);
      if (!order) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Order not found' });
      }

      if (!order.rider || order.rider.toString() !== (req.user as any)._id.toString()) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'You are not assigned to this order' });
      }

      if (order.status !== OrderStatus.ASSIGNED) {
        await session.abortTransaction();
        return res.status(409).json({ message: `Order cannot be picked up from status ${order.status}` });
      }

      order.status = OrderStatus.PICKED_UP; 
      order.rider = (req.user as any)._id; 

      order.tracking = {
        location: { lat: 0, lng: 0 },
        updatedAt: new Date()
      };
      (order as any).pickedUpAt = new Date();

      order.statusHistory.push({
        status: OrderStatus.PICKED_UP,
        changedAt: new Date(),
        changedBy: (req.user as any)._id,
        actorRole: 'RIDER'
      });

      await order.save({ session });

      await RiderProfile.updateOne(
        { user: (req.user as any)._id }, 
        { availabilityStatus: RiderAvailability.BUSY, currentDelivery: order._id },
        { session }
      );

      const pickedUpEvent = new OrderEvent({
        order: order._id,
        status: OrderStatus.PICKED_UP,
        notes: 'Rider picked up order',
        triggeredBy: (req.user as any)._id
      });
      await pickedUpEvent.save({ session });

      await session.commitTransaction();
      
      try {
        const { getIO } = require('../../config/socket');
        const io = getIO();
        io.to(`order_${order._id}`).emit('order:status:update', {
          orderId: order._id,
          status: OrderStatus.PICKED_UP,
          timestamp: new Date()
        });
        io.to('admin_deliveries').emit('order:status:update', {
          orderId: order._id,
          status: OrderStatus.PICKED_UP,
          timestamp: new Date()
        });
      } catch (e) {
        console.error('Socket emission failed in pickupOrder:', e);
      }

      // Schedule auto progression to out for delivery if configured
      const { OrderAutomation } = require('../order/order.automation');
      if (require('../../config/env').env.RIDER_OUT_FOR_DELIVERY_DELAY_MS) {
        setTimeout(() => {
          OrderAutomation.processOutForDelivery(order._id, (req.user as any)._id).catch((err: any) => console.error('Auto-out-for-delivery failed:', err));
        }, require('../../config/env').env.RIDER_OUT_FOR_DELIVERY_DELAY_MS);
      }

      res.json({ message: 'Order picked up', order });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error during rider pickup:', error);
      res.status(500).json({ message: 'Failed to pickup order', error: error instanceof Error ? error.message : String(error) });
    } finally {
      session.endSession();
    }
  }

  static async updateLocation(req: Request, res: Response) {
    try {
      console.log('[LOCATION API] request', req.body);
      if (!req.user || req.user.role !== UserRole.RIDER) {
        return res.status(401).json({ message: 'Not authorized as rider' });
      }

      const { latitude, longitude, accuracy, speed, heading, timestamp, orderId } = req.body;
      const riderId = (req.user as any)._id;
      const locTimestamp = timestamp ? new Date(timestamp) : new Date();

      // 1. Save to RiderLocation collection
      const riderLoc = new RiderLocation({
        riderId,
        orderId: orderId || undefined,
        location: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)]
        },
        accuracy,
        speed,
        heading,
        timestamp: locTimestamp
      });
      await riderLoc.save();
      console.log('[LOCATION DB] saved');

      // 2. Update active order and RiderProfile
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.rider?.toString() === riderId.toString()) {
          order.tracking = {
            location: { lat: latitude, lng: longitude },
            updatedAt: locTimestamp
          };
          await order.save();
          
          await RiderProfile.updateOne(
            { user: riderId },
            { lastLocation: { lat: latitude, lng: longitude, timestamp: locTimestamp } }
          );

          try {
            const { getIO } = require('../../config/socket');
            const io = getIO();
            const payload = {
              riderId,
              orderId,
              latitude,
              longitude,
              accuracy,
              speed,
              heading,
              timestamp: locTimestamp
            };
            // emit to admin room
            io.to('admin_deliveries').emit('rider:location:update', payload);
            // emit to customer room
            io.to(`order_${orderId}`).emit('rider:location:update', payload);
            console.log('[SOCKET] location emitted');
          } catch (e) {
            console.error('Socket emission failed', e);
          }
        }
      } else {
         await RiderProfile.updateOne(
            { user: riderId },
            { lastLocation: { lat: latitude, lng: longitude, timestamp: locTimestamp } }
          );
      }

      console.log('[LOCATION API] success');
      res.json({ message: 'Location updated', success: true });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const riderId = (req.user as any)._id;
      const profile = await RiderProfile.findOne({ user: riderId }).populate('user', 'name phone email').lean();
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Rider profile not found'
        });
      }

      // Calculate today's stats from Order collection
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todaysOrders = await Order.find({
        rider: riderId,
        status: OrderStatus.DELIVERED,
        deliveredAt: { $gte: startOfDay } // Note: we need deliveredAt to be saved correctly in deliverOrder!
      });

      // If deliveredAt isn't accurately captured everywhere, fallback to updatedAt for today's DELIVERED orders
      const deliveriesToday = await Order.find({
        rider: riderId,
        status: OrderStatus.DELIVERED,
        updatedAt: { $gte: startOfDay }
      });

      const todayDeliveries = deliveriesToday.length;
      const todayEarnings = deliveriesToday.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

      res.json({
        success: true,
        data: {
          ...profile,
          todayDeliveries,
          todayEarnings
        }
      });
    } catch (error) {
      console.error('Error fetching rider profile:', error);
      res.status(500).json({ message: 'Failed to fetch rider profile' });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user || req.user.role !== UserRole.RIDER) {
        return res.status(403).json({ message: 'Forbidden. Only riders can access this endpoint.' });
      }

      const { fullName, phone, vehicleType, vehicleNumber, licenseNumber } = req.body;

      if (!fullName || !phone || !vehicleType || !vehicleNumber || !licenseNumber) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
        return res.status(400).json({ message: 'Invalid Indian mobile number' });
      }

      const normalizedVehicleNumber = vehicleNumber.trim().toUpperCase();
      const normalizedLicenseNumber = licenseNumber.trim().toUpperCase();
      const normalizedFullName = fullName.trim();

      // Check if phone exists on another User
      const { User } = require('../auth/auth.model');
      const existingUser = await User.findOne({ phone: normalizedPhone, _id: { $ne: (req.user as any)._id } });
      if (existingUser) {
        return res.status(409).json({ message: 'Phone number already exists for another user.' });
      }

      const user = await User.findById((req.user as any)._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.name = normalizedFullName;
      user.phone = normalizedPhone;
      user.profileComplete = true;
      await user.save();

      let profile = await RiderProfile.findOne({ user: user._id });
      if (!profile) {
        profile = new RiderProfile({
          user: user._id,
          fullName: normalizedFullName,
          phone: normalizedPhone,
          vehicleType,
          vehicleNumber: normalizedVehicleNumber,
          licenseNumber: normalizedLicenseNumber,
          profileComplete: true,
          availabilityStatus: RiderAvailability.AVAILABLE
        });
      } else {
        profile.fullName = normalizedFullName;
        profile.phone = normalizedPhone;
        profile.vehicleType = vehicleType;
        profile.vehicleNumber = normalizedVehicleNumber;
        profile.licenseNumber = normalizedLicenseNumber;
        profile.profileComplete = true;
        profile.availabilityStatus = RiderAvailability.AVAILABLE;
      }
      
      await profile.save();

      res.json({
        success: true,
        profileComplete: true,
        rider: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          vehicleType: profile.vehicleType,
          vehicleNumber: profile.vehicleNumber,
          licenseNumber: profile.licenseNumber
        }
      });
    } catch (error: any) {
      console.error('Error updating rider profile:', error);
      res.status(500).json({ message: 'Failed to save rider profile' });
    }
  }
}
