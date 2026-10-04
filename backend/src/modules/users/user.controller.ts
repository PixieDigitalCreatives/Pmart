import { Request, Response, NextFunction } from 'express';
import { CustomerProfile } from './user.model';
import { RiderProfile } from '../rider/rider.model';
import { Order } from '../order/order.model';

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });

      let profile;
      if (req.user.role === 'CUSTOMER') {
        profile = await CustomerProfile.findOne({ user: (req.user as any)._id });
      } else if (req.user.role === 'RIDER') {
        const riderId = (req.user as any)._id;
        const profileDoc = await RiderProfile.findOne({ user: riderId });
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todaysOrders = await Order.find({
          rider: riderId,
          status: 'DELIVERED',
          updatedAt: { $gte: startOfDay }
        });

        const todayDeliveries = todaysOrders.length;
        const todayEarnings = todaysOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

        profile = profileDoc ? profileDoc.toObject() : null;
        if (profile) {
          profile.todayDeliveries = todayDeliveries;
          profile.todayEarnings = todayEarnings;
        }
      }

      // Return base user data merged with profile
      const baseUser = {
        id: (req.user as any)._id,
        email: req.user.email,
        name: req.user.name,
        phone: req.user.phone,
        role: req.user.role,
        profileComplete: req.user.profileComplete,
      };

      res.json({ success: true, data: { ...baseUser, profile } });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });

      let profile;
      if (req.user.role === 'CUSTOMER') {
        profile = await CustomerProfile.findOneAndUpdate(
          { user: (req.user as any)._id },
          { $set: req.body },
          { new: true, upsert: true }
        );
      } else if (req.user.role === 'RIDER') {
        profile = await RiderProfile.findOneAndUpdate(
          { user: (req.user as any)._id },
          { $set: req.body },
          { new: true, upsert: true }
        );
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const profile = await CustomerProfile.findOne({ user: (req.user as any)._id });
      if (!profile) return res.json({ success: true, data: [] });
      res.json({ success: true, data: profile.addresses });
    } catch (error) {
      next(error);
    }
  }

  static async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      
      const profile = await CustomerProfile.findOne({ user: (req.user as any)._id });
      if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
      
      if (req.body.isDefault) {
        profile.addresses.forEach(a => a.isDefault = false);
      }

      profile.addresses.push(req.body);
      await profile.save();
      
      res.json({ success: true, data: profile.addresses });
    } catch (error) {
      next(error);
    }
  }
}
