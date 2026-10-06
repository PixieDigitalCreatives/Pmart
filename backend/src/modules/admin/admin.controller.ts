import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, OrderStatus } from '../order/order.model';
import { User, UserRole } from '../auth/auth.model';
import { Shop } from '../shop/shop.model';
import { RiderProfile, RiderAvailability } from '../rider/rider.model';
import { AuditLog } from './audit.model';

export class AdminController {
  static async getDashboardStats(req: Request, res: Response) {
    try {
      // 1. Total Orders
      const totalOrders = await Order.countDocuments();

      // 2. Active Orders
      const activeStatuses = [
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.ASSIGNED,
        OrderStatus.PICKED_UP,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERY_FAILED
      ];
      const activeOrders = await Order.countDocuments({ status: { $in: activeStatuses } });

      // 3. Orders in Delivery
      const ordersInDelivery = await Order.countDocuments({ status: OrderStatus.OUT_FOR_DELIVERY });

      // 4. Total Revenue & Today's Revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const revenueAggregation = await Order.aggregate([
        { $match: { status: { $nin: [OrderStatus.CANCELLED, OrderStatus.REJECTED] } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            todayRevenue: {
              $sum: {
                $cond: [{ $gte: ["$createdAt", today] }, "$totalAmount", 0]
              }
            }
          }
        }
      ]);
      const revenue = revenueAggregation[0] || { totalRevenue: 0, todayRevenue: 0 };

      // 5. Registered Customers
      const registeredCustomers = await User.countDocuments({ role: UserRole.CUSTOMER });

      const activeShops = await Shop.countDocuments({ isActive: true });
      const activeRiders = await User.countDocuments({ role: UserRole.RIDER });
      
      res.json({
        totalOrders,
        activeOrders,
        ordersInDelivery,
        totalRevenue: revenue.totalRevenue,
        todayRevenue: revenue.todayRevenue,
        registeredCustomers,
        activeShops,
        activeRiders,
        averageDeliveryTime: "N/A", // Placeholder
        onTimeDeliveryRate: "N/A" // Placeholder
      });
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  }

  static async getReports(req: Request, res: Response) {
    try {
      const { period } = req.query; // 'today', 'this-week', 'this-month'
      const now = new Date();
      let startDate = new Date();
      if (period === 'this-week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'this-month') {
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate.setHours(0, 0, 0, 0); // today
      }

      const orders = await Order.find({
        createdAt: { $gte: startDate, $lte: now },
        status: { $nin: [OrderStatus.CANCELLED, OrderStatus.REJECTED] }
      }).populate('items.product');

      let totalSales = 0;
      let slaBreaches = 0;
      const categories: any = {};

      orders.forEach(o => {
        totalSales += o.totalAmount;
        // Simple SLA check: if delivered, compare deliveredAt and createdAt
        if (o.status === OrderStatus.DELIVERED) {
           const timeTaken = new Date((o as any).updatedAt).getTime() - new Date((o as any).createdAt).getTime();
           if (timeTaken > 15 * 60 * 1000) slaBreaches++;
        }
        
        o.items.forEach((item: any) => {
           // We just use item.name if product population failed or category is missing
           const cat = item.product?.category || 'General';
           categories[cat] = (categories[cat] || 0) + (item.price * item.quantity);
        });
      });

      const catDist = Object.keys(categories).map(k => ({
        category: k,
        share: totalSales > 0 ? `${Math.round((categories[k] / totalSales) * 100)}%` : '0%'
      }));

      res.json({
        totalSales,
        totalOrders: orders.length,
        avgTicketSize: orders.length > 0 ? Math.round(totalSales / orders.length) : 0,
        slaBreaches,
        categoryDistribution: catDist.length > 0 ? catDist : [{ category: 'No Data', share: '0%' }]
      });
    } catch (error) {
      console.error('Error fetching admin reports:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  }

  static async getOrders(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
      if (req.query.paymentStatus && req.query.paymentStatus !== 'all') filter.paymentStatus = req.query.paymentStatus;
      if (req.query.search) {
        filter.orderNumber = { $regex: req.query.search, $options: 'i' };
      }

      const orders = await Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('shop', 'name')
        .populate('rider', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Order.countDocuments(filter);

      res.json({
        orders,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  }

  static async getOrderById(req: Request, res: Response) {
    try {
      const order = await Order.findById(req.params.id)
        .populate('customer', 'name email phone')
        .populate('shop', 'name location')
        .populate('rider', 'name phone vehicleInfo');

      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.json(order);
    } catch (error) {
      console.error('Error fetching admin order:', error);
      res.status(500).json({ message: 'Failed to fetch order details' });
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { OrderController } = require('../order/order.controller');
      return await OrderController.updateOrderStatus(req, res, next);
    } catch (error) {
      console.error('Error updating order status in AdminController:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  }

  static async assignRider(req: Request, res: Response) {
    let retries = 3;
    while (retries > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const order = await Order.findById(req.params.id).session(session);
        if (!order) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Order not found' });
        }
        
        if (![OrderStatus.READY, OrderStatus.ASSIGNED].includes(order.status)) {
          await session.abortTransaction();
          return res.status(409).json({ message: 'Order must be READY or ASSIGNED to assign a rider' });
        }

        const { riderId } = req.body;
        const riderUser = await User.findOne({ _id: riderId, role: UserRole.RIDER, isActive: true }).session(session);
        if (!riderUser) {
          await session.abortTransaction();
          return res.status(404).json({ message: 'Rider not found or inactive' });
        }

        const profile = await RiderProfile.findOne({ user: riderId, isActive: true, availabilityStatus: RiderAvailability.AVAILABLE }).session(session);
        if (!profile) {
          await session.abortTransaction();
          return res.status(409).json({ message: 'Rider is not available' });
        }

        // If reassignment, free previous rider
        if (order.rider && order.rider.toString() !== riderId) {
          await RiderProfile.updateOne({ user: order.rider }, { availabilityStatus: RiderAvailability.AVAILABLE, currentDelivery: null }).session(session);
        }

        order.rider = riderUser._id as any;
        if (order.status === OrderStatus.READY) {
          order.status = OrderStatus.ASSIGNED;
          (order as any).assignedAt = new Date();
          order.statusHistory.push({
            status: OrderStatus.ASSIGNED,
            changedAt: new Date(),
            changedBy: (req as any).user?._id
          });
        }
        await order.save({ session });

        if (order.status === OrderStatus.ASSIGNED) {
          const { OrderEvent } = require('../order/order.model');
          const event = new OrderEvent({
            order: order._id,
            status: OrderStatus.ASSIGNED,
            notes: `Order assigned to rider ${riderUser.name}`,
            triggeredBy: (req as any).user?._id
          });
          await event.save({ session });
        }

        profile.availabilityStatus = RiderAvailability.BUSY;
        profile.currentDelivery = order._id as any;
        await profile.save({ session });

        // Trigger automatic rider progression for testing (durably as part of transaction)
        const { OrderAutomation } = require('../order/order.automation');
        await OrderAutomation.scheduleRiderProgression(order._id, riderUser._id, session);

        let commitRetries = 3;
        while (commitRetries > 0) {
          try {
            await session.commitTransaction();
            break;
          } catch (commitError: any) {
            if (commitError.hasErrorLabel && commitError.hasErrorLabel('UnknownTransactionCommitResult')) {
              commitRetries--;
              if (commitRetries === 0) throw commitError;
              await new Promise(resolve => setTimeout(resolve, 50));
            } else {
              throw commitError;
            }
          }
        }

        try {
          const { getIO } = require('../../config/socket');
          getIO().to(`rider_${riderId}`).emit('delivery:assigned', order);
          getIO().to('admin_deliveries').emit('order_status_update', { orderId: order._id, status: order.status, rider: riderId });
        } catch (e) {}

        return res.json(order);
      } catch (error: any) {
        await session.abortTransaction();
        const isTransient = error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError');
        const isWriteConflict = error.code === 112;
        if (isTransient || isWriteConflict) {
          retries--;
          if (retries === 0) {
             return res.status(409).json({ message: 'System busy. Please try assigning again.' });
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        console.error('Failed to assign rider:', error);
        return res.status(500).json({ message: 'Failed to assign rider', error: error.message, stack: error.stack });
      } finally {
        session.endSession();
      }
    }
  }

  static async getActiveDeliveries(req: Request, res: Response) {
    try {
      const activeStatuses = [
        OrderStatus.ASSIGNED,
        OrderStatus.PICKED_UP,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.ARRIVED,
        OrderStatus.DELIVERY_FAILED
      ];
      
      const deliveries = await Order.find({ status: { $in: activeStatuses } })
        .populate('customer', 'name email phone')
        .populate('shop', 'name location')
        .populate('rider', 'name phone vehicleInfo vehicleNumber speed rating')
        .sort({ updatedAt: -1 });

      res.json(deliveries);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
      res.status(500).json({ message: 'Failed to fetch deliveries' });
    }
  }


  static async getCustomers(req: Request, res: Response) {
    try {
      const customers = await User.find({ role: UserRole.CUSTOMER }).select('-password');
      // Format to match frontend expectations if needed, or just return
      const formatted = customers.map(c => ({
        id: c._id,
        name: c.name,
        phone: c.phone || 'N/A',
        email: c.email || 'N/A',
        orders: 0,
        spent: 0,
        status: 'Active'
      }));
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  }

  static async getRiders(req: Request, res: Response) {
    try {
      const riders = await User.find({ role: UserRole.RIDER }).select('-password');
      const formatted = await Promise.all(riders.map(async (r: any) => {
        const profile = await RiderProfile.findOne({ user: r._id });
        return {
          id: r._id,
          name: r.name,
          email: r.email,
          phone: r.phone || 'N/A',
          vehicleType: profile?.vehicleType || 'N/A',
          vehicleNumber: profile?.vehicleNumber || 'N/A',
          licenseNumber: profile?.licenseNumber || 'N/A',
          status: profile?.availabilityStatus || RiderAvailability.OFFLINE,
          isActive: r.isActive,
          totalDeliveries: profile?.totalDeliveries || 0,
          completedDeliveries: profile?.completedDeliveries || 0,
          rating: profile?.rating || 5.0,
          currentDelivery: profile?.currentDelivery
        };
      }));
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch riders' });
    }
  }

  static async getEligibleRiders(req: Request, res: Response) {
    try {
      const profiles = await RiderProfile.find({ 
        isActive: true, 
        availabilityStatus: { $ne: RiderAvailability.OFFLINE } 
      }).populate('user', 'name phone email isActive');
      
      const eligible = profiles.filter(p => (p.user as any)?.isActive).map(p => ({
        id: (p.user as any)._id,
        name: (p.user as any).name,
        phone: (p.user as any).phone,
        vehicleType: p.vehicleType,
        vehicleNumber: p.vehicleNumber,
        status: p.availabilityStatus,
        activeDeliveries: p.currentDelivery ? 1 : 0
      }));
      res.json(eligible);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch eligible riders' });
    }
  }

  static async searchUsers(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }

      // Check if it's a phone number search or name search
      const cleanQ = q.trim();
      const isPhoneLike = /^[\d\+]+$/.test(cleanQ);

      let query: any = {};
      if (isPhoneLike) {
        const { normalizeMobileNumber } = require('../../utils/auth');
        const normalized = normalizeMobileNumber(cleanQ);
        query = { phone: normalized };
      } else {
        query = { name: { $regex: cleanQ, $options: 'i' } };
      }

      const users = await User.find(query).limit(20).select('name phone role isActive profileComplete');
      
      // Mask phone numbers for partial name search
      const results = users.map((u: any) => ({
        id: u._id,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        profileComplete: u.profileComplete,
        phone: isPhoneLike ? u.phone : (u.phone ? `+XX-XXXXXX${u.phone.slice(-4)}` : 'N/A')
      }));

      res.json(results);
    } catch (error) {
      console.error('Search Users Error:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  }

  static async createRider(req: Request, res: Response) {
    try {
      const { name, phone, vehicleType, vehicleNumber, licenseNumber, password } = req.body;
      const fullName = name || req.body.fullName;

      if (!fullName || !phone || !vehicleType || !vehicleNumber || !password) {
        return res.status(422).json({ message: 'All fields are required: name, phone, vehicleType, vehicleNumber, password' });
      }

      if (password.length < 8) {
        return res.status(422).json({ message: 'Initial password must be at least 8 characters' });
      }

      const { normalizeMobileNumber, hashPassword } = require('../../utils/auth');
      const normalizedPhone = normalizeMobileNumber(phone);

      const phoneUser = await User.findOne({ phone: normalizedPhone });
      if (phoneUser) {
        if (phoneUser.role === UserRole.RIDER) {
          return res.status(409).json({ message: 'A Rider with this phone number already exists.', existingRider: true, field: 'phone' });
        } else {
          return res.status(409).json({ message: 'A Customer/Admin with this phone number already exists. Cross-role linking is blocked.', field: 'phone' });
        }
      }
      
      const email = req.body.email ? req.body.email.toLowerCase().trim() : undefined;
      if (email) {
        const emailUser = await User.findOne({ email });
        if (emailUser) {
          return res.status(409).json({ message: 'An account with this email already exists.', field: 'email' });
        }
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const passwordHash = await hashPassword(password);
        
        const user = new User({
          name: fullName, 
          email: email,
          phone: normalizedPhone, 
          role: UserRole.RIDER, 
          profileComplete: true, // Rider provisioned by admin is ready to login
          isActive: true, 
          mustChangePassword: true,
          authProvider: 'PHONE',
          passwordHash
        });
        await user.save({ session });

        const profile = new RiderProfile({
          user: user._id,
          fullName,
          phone: normalizedPhone,
          vehicleType,
          vehicleNumber,
          licenseNumber: licenseNumber || vehicleNumber,
          availabilityStatus: RiderAvailability.AVAILABLE,
          profileComplete: true
        });
        await profile.save({ session });

        await session.commitTransaction();
        session.endSession();
        
        res.status(201).json({ 
          message: 'Rider created successfully', 
          riderId: user._id
        });
      } catch (txnError: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('Rider creation failed, transaction aborted:', txnError);
        return res.status(500).json({ message: txnError.message || 'Failed to create rider and profile atomically' });
      }
    } catch (error: any) {
      console.error('Create Rider Error:', error);
      res.status(500).json({ message: error.message || 'Failed to create rider' });
    }
  }

  static async updateRider(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, vehicleType, vehicleNumber, licenseNumber, availabilityStatus } = req.body;

      const user = await User.findById(id);
      if (!user || user.role !== UserRole.RIDER) return res.status(404).json({ message: 'Rider not found' });

      if (name) user.name = name;
      if (phone) user.phone = phone;
      await user.save();

      const profile = await RiderProfile.findOne({ user: id });
      if (profile) {
        if (name) profile.fullName = name;
        if (vehicleType) profile.vehicleType = vehicleType;
        if (vehicleNumber) profile.vehicleNumber = vehicleNumber;
        if (licenseNumber) profile.licenseNumber = licenseNumber;
        if (availabilityStatus) profile.availabilityStatus = availabilityStatus;
        await profile.save();
      }

      res.json({ message: 'Rider updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update rider' });
    }
  }

  static async updateRiderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const user = await User.findById(id);
      if (!user || user.role !== UserRole.RIDER) return res.status(404).json({ message: 'Rider not found' });

      if (!isActive) {
        const profile = await RiderProfile.findOne({ user: id });
        if (profile && profile.currentDelivery) {
          return res.status(409).json({ message: 'Cannot deactivate rider with an active delivery' });
        }
      }

      user.isActive = isActive;
      await user.save();
      await RiderProfile.updateOne({ user: id }, { isActive });

      res.json({ message: `Rider ${isActive ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update rider status' });
    }
  }

  static async deleteRider(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user || user.role !== UserRole.RIDER) return res.status(404).json({ message: 'Rider not found' });

      // Check if rider is currently assigned to an active delivery
      const profile = await RiderProfile.findOne({ user: id });
      if (profile && profile.currentDelivery) {
        return res.status(409).json({ message: 'Cannot delete rider with an active delivery' });
      }

      // Delete the rider profile and the user account
      await RiderProfile.deleteOne({ user: id });
      await User.deleteOne({ _id: id });

      res.json({ message: 'Rider deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete rider' });
    }
  }


  static async getSettings(req: Request, res: Response) {
    try {
      const { Settings } = await import('./settings.model');
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const { freeDeliveryThreshold, baseDeliveryFee, platformHandlingFee } = req.body;

      // Server-side validation
      const toNum = (val: unknown, field: string): number => {
        const n = Number(val);
        if (val === undefined || val === null || val === '') {
          throw new Error(`${field} is required`);
        }
        if (!Number.isFinite(n)) {
          throw new Error(`${field} must be a valid number`);
        }
        if (n < 0) {
          throw new Error(`${field} cannot be negative`);
        }
        if (n > 100000) {
          throw new Error(`${field} exceeds the maximum allowed value`);
        }
        return n;
      };

      const validated = {
        freeDeliveryThreshold: toNum(freeDeliveryThreshold, 'freeDeliveryThreshold'),
        baseDeliveryFee: toNum(baseDeliveryFee, 'baseDeliveryFee'),
        platformHandlingFee: toNum(platformHandlingFee, 'platformHandlingFee'),
      };

      const { Settings } = await import('./settings.model');
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings(validated);
      } else {
        Object.assign(settings, validated);
      }
      await settings.save();

      await AuditLog.create({
        user: (req as any).user?._id,
        action: 'UPDATE',
        resource: 'Settings',
        resourceId: (settings._id as any).toString(),
        details: validated
      });

      res.json(settings);
    } catch (error: any) {
      if (error.message && !error.message.includes('Failed')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to update settings' });
    }
  }

  static async getEmployees(req: Request, res: Response) {
    try {
      const employees = await User.find({ role: { $in: [UserRole.EMPLOYEE, UserRole.ADMIN] } }).select('-passwordHash');
      const formatted = employees.map(e => ({
        id: e._id,
        name: e.name,
        email: e.email || 'N/A',
        phone: e.phone || 'N/A',
        role: e.role,
        permissions: e.permissions || [],
        isActive: e.isActive
      }));
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  }

  static async createEmployee(req: Request, res: Response) {
    try {
      const { name, phone, email, permissions } = req.body;
      
      if (!name || !phone) {
        return res.status(422).json({ message: 'Name and phone are required' });
      }

      const currentUser = (req as any).user;
      if (currentUser?.role !== UserRole.ADMIN) {
        if (permissions && Array.isArray(permissions)) {
          const hasAll = permissions.every(p => currentUser?.permissions?.includes(p));
          if (!hasAll) {
            return res.status(403).json({ message: 'Cannot grant permissions you do not possess' });
          }
        }
      }

      const { normalizeMobileNumber } = require('../../utils/auth');
      const normalizedPhone = normalizeMobileNumber(phone);

      const existingUser = await User.findOne({ phone: normalizedPhone });
      if (existingUser) {
        return res.status(409).json({ message: 'User with this phone number already exists.' });
      }

      const crypto = require('crypto');
      const setupToken = crypto.randomBytes(32).toString('hex');

      const user = new User({
        name,
        phone: normalizedPhone,
        email,
        role: UserRole.EMPLOYEE,
        permissions: permissions || [],
        profileComplete: true,
        isActive: true,
        authProvider: 'PHONE',
        setupToken,
        setupTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      await user.save();

      await AuditLog.create({
        user: (req as any).user?._id,
        action: 'CREATE',
        resource: 'Employee',
        resourceId: (user._id as any).toString(),
        details: { name, phone: normalizedPhone, permissions }
      });

      res.status(201).json({
        message: 'Employee created successfully',
        employeeId: user._id,
        setupToken
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to create employee' });
    }
  }

  static async updateEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, email, permissions, isActive } = req.body;

      const user = await User.findById(id);
      if (!user || (user.role !== UserRole.EMPLOYEE && user.role !== UserRole.ADMIN)) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const currentUser = (req as any).user;
      
      // Prevent non-admin from modifying admin or removing themselves
      if (user.role === UserRole.ADMIN && currentUser?._id?.toString() !== id) {
          if (currentUser?.role !== UserRole.ADMIN) {
             return res.status(403).json({ message: 'Cannot modify ADMIN user' });
          }
      }

      // Prevent employees from modifying their own permissions or role
      if (currentUser?.role !== UserRole.ADMIN && currentUser?._id?.toString() === id) {
        if (permissions) {
          return res.status(403).json({ message: 'Cannot modify your own permissions' });
        }
      }

      // Prevent employees from granting permissions they do not hold
      if (currentUser?.role !== UserRole.ADMIN && permissions && Array.isArray(permissions)) {
        const hasAll = permissions.every((p: string) => currentUser?.permissions?.includes(p));
        if (!hasAll) {
          return res.status(403).json({ message: 'Cannot grant permissions you do not possess' });
        }
      }

      if (name) user.name = name;
      if (email) user.email = email;
      if (permissions) user.permissions = permissions;
      if (typeof isActive === 'boolean') user.isActive = isActive;
      
      if (phone) {
        const { normalizeMobileNumber } = require('../../utils/auth');
        user.phone = normalizeMobileNumber(phone);
      }

      await user.save();

      await AuditLog.create({
        user: (req as any).user?._id,
        action: 'UPDATE',
        resource: 'Employee',
        resourceId: (user._id as any).toString(),
        details: { permissions: user.permissions, isActive: user.isActive }
      });

      res.json({ message: 'Employee updated successfully', user });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update employee' });
    }
  }

  static async deleteEmployee(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user || user.role !== UserRole.EMPLOYEE) {
        // Explicitly prevent deleting an ADMIN via this route
        return res.status(404).json({ message: 'Employee not found or cannot be deleted' });
      }

      await User.deleteOne({ _id: id });

      await AuditLog.create({
        user: (req as any).user?._id,
        action: 'DELETE',
        resource: 'Employee',
        resourceId: id
      });

      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const logs = await AuditLog.find()
        .populate('user', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await AuditLog.countDocuments();

      res.json({
        logs,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  }
}
