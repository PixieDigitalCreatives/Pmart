import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, OrderEvent, OrderStatus } from './order.model';
import { Address } from '../address/address.model';
import { Product } from '../catalog/catalog.model';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NotificationService } from '../../services/notification.service';
import { decryptOtp } from '../../utils/encryption';
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.ASSIGNED],
  [OrderStatus.ASSIGNED]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.ARRIVED, OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
  [OrderStatus.ARRIVED]: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
  [OrderStatus.DELIVERY_FAILED]: [OrderStatus.RETRY, OrderStatus.CANCELLED],
  [OrderStatus.RETRY]: [OrderStatus.ASSIGNED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.CANCELLED]: []
};

export class OrderController {
  private static async getPopulatedOrder(orderId: string | mongoose.Types.ObjectId) {
    return Order.findById(orderId)
      .populate('shop', 'name address isActive')
      .populate('customer', 'name fullName phone email')
      .populate('rider', 'name fullName phone vehicleNumber rating')
      .populate('items.product', 'name price image stockCount isActive');
  }

  static async checkout(req: Request, res: Response, next: NextFunction) {
    let retries = 3;
    while (retries > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        if (!req.user || (req.user as any).role !== 'CUSTOMER') {
          await session.abortTransaction();
          return res.status(401).json({ success: false, message: 'Not authorized or invalid role' });
        }

        const { items, deliveryAddress, addressId, deliveryInstructions, paymentMethod, idempotencyKey } = req.body;

        if (!items || items.length === 0) {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        let finalDeliveryAddress = null;
        let finalDeliveryInstructions = deliveryInstructions;

        if (addressId) {
          const addressDoc = await Address.findById(addressId).session(session);
          if (!addressDoc) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Invalid address selected' });
          }
          if (addressDoc.user.toString() !== (req.user as any)._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Address does not belong to you' });
          }

          finalDeliveryAddress = {
            recipientName: addressDoc.recipientName,
            recipientPhone: addressDoc.recipientPhone,
            label: addressDoc.label,
            houseNumber: addressDoc.houseNumber,
            buildingName: addressDoc.buildingName,
            apartment: '', // Address model does not have apartment
            floor: addressDoc.floor,
            landmark: addressDoc.landmark,
            street: addressDoc.street || addressDoc.formattedAddress,
            area: addressDoc.area,
            city: addressDoc.city,
            district: addressDoc.district,
            state: addressDoc.state,
            pincode: addressDoc.pincode,
            country: addressDoc.country,
            formattedAddress: addressDoc.formattedAddress,
            coordinates: {
              lng: addressDoc.location.coordinates[0],
              lat: addressDoc.location.coordinates[1]
            },
            location: addressDoc.location
          };
          if (addressDoc.deliveryInstructions && !finalDeliveryInstructions) {
            finalDeliveryInstructions = addressDoc.deliveryInstructions;
          }
        } else if (deliveryAddress) {
          if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode || !deliveryAddress.coordinates || typeof deliveryAddress.coordinates.lat !== 'number' || typeof deliveryAddress.coordinates.lng !== 'number') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Invalid delivery address' });
          }
          finalDeliveryAddress = deliveryAddress;
        } else {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Delivery address is required' });
        }

        if (idempotencyKey) {
          const existingOrder = await Order.findOne({ idempotencyKey }).session(session);
          if (existingOrder) {
            await session.commitTransaction();
            return res.json({ success: true, data: existingOrder, message: 'Order already exists' });
          }
        }

        let subTotal = 0;
        const orderItems = [];
        const shopId = items[0].shop; // Assume single shop

        if (!shopId) {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Shop reference is missing from cart items' });
        }
        
        const { Shop } = require('../shop/shop.model');
        const shop = await Shop.findById(shopId).session(session);
        if (!shop) {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Invalid shop reference. The shop does not exist.' });
        }
        if (!shop.isActive) {
          await session.abortTransaction();
          return res.status(400).json({ success: false, message: 'Shop is currently inactive and cannot accept orders.' });
        }

        for (const item of items) {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: `Invalid quantity for item` });
          }

          // Atomic stock validation and decrement, enforcing the product belongs to the expected shop
          const product = await Product.findOneAndUpdate(
            { _id: item.product, shop: shopId, stockCount: { $gte: item.quantity }, isActive: true },
            { $inc: { stockCount: -item.quantity } },
            { session, new: true }
          );

          if (!product) {
            await session.abortTransaction();
            // We can fetch to see if it was stock or active issue
            const pCheck = await Product.findById(item.product).session(session);
            if (!pCheck || !pCheck.isActive) {
              return res.status(400).json({
                success: false,
                code: "PRODUCT_NOT_FOUND",
                message: "A product in your cart is no longer available.",
                items: [{ productId: item.product, reason: "PRODUCT_NOT_FOUND" }]
              });
            }
            return res.status(400).json({ 
              success: false, 
              code: "INSUFFICIENT_STOCK",
              message: `Not enough stock for ${pCheck.name}` 
            });
          }
          
          // Price validation from DB
          const priceToUse = product.discountPrice ?? product.price;
          subTotal += priceToUse * item.quantity;

          orderItems.push({
            product: product._id,
            name: product.name,
            price: priceToUse,
            quantity: item.quantity
          });
        }

        // Read settings dynamically
        let deliveryFee = 5.0; // Fallback
        try {
          const { Settings } = await import('../admin/settings.model');
          const settings = await Settings.findOne().session(session);
          if (settings) {
            deliveryFee = subTotal >= settings.freeDeliveryThreshold ? 0 : settings.baseDeliveryFee;
            // Note: we can also add platformHandlingFee if we had a field for it on Order, 
            // but currently the model only has subTotal, deliveryFee, totalAmount.
            // Let's add platformHandlingFee to deliveryFee for simplicity if it exists, or just use baseDeliveryFee.
            // Currently keeping it simple:
            if (subTotal < settings.freeDeliveryThreshold) {
              deliveryFee += (settings.platformHandlingFee || 0);
            }
          }
        } catch (e) {
          console.error('Settings not found, using fallback', e);
        }

        const totalAmount = subTotal + deliveryFee;

        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const { normalizeCoordinates } = require('../../utils/geo');
        const [lng, lat] = normalizeCoordinates(finalDeliveryAddress.coordinates.lng, finalDeliveryAddress.coordinates.lat);

        const normalizedDeliveryAddress = {
          ...finalDeliveryAddress,
          location: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        };
        
        const order = new Order({
          orderNumber,
          customer: (req.user as any)._id,
          shop: shopId,
          items: orderItems,
          subTotal,
          deliveryFee,
          totalAmount,
          status: OrderStatus.PENDING,
          deliveryAddress: normalizedDeliveryAddress,
          deliveryInstructions: finalDeliveryInstructions,
          paymentMethod: paymentMethod || 'COD',
          paymentStatus: 'PENDING',
          idempotencyKey,
          statusHistory: [{
            status: OrderStatus.PENDING,
            changedAt: new Date(),
            note: 'Order placed'
          }]
        });

        await order.save({ session });

        const event = new OrderEvent({
          order: order._id,
          status: OrderStatus.PENDING,
          notes: 'Order placed',
          triggeredBy: (req.user as any)._id
        });
        await event.save({ session });

        await session.commitTransaction();
        
        return res.status(201).json({ success: true, data: order });
      } catch (error: any) {
        await session.abortTransaction();
        
        // Retry logic for transient errors
        const isTransient = error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError');
        const isWriteConflict = error.code === 112; // MongoDB WriteConflict code
        
        if (isTransient || isWriteConflict) {
          retries--;
          if (retries === 0) {
            return res.status(409).json({ 
              success: false, 
              message: 'High traffic detected. Stock may be unavailable or checkout is busy. Please try again.' 
            });
          }
          // Exponential backoff or small delay could be added here
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }

        // If it's another kind of error, pass it to the global handler
        return next(error);
      } finally {
        session.endSession();
      }
    }
  }

  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      
      let filter: any = {};
      if (req.user.role === 'CUSTOMER') {
        filter.customer = (req.user as any)._id;
      } else if (req.user.role === 'RIDER') {
        filter.rider = (req.user as any)._id;
      } else if (req.user.role === 'SHOP_OWNER') {
        const { Shop } = await import('../shop/shop.model');
        const shops = await Shop.find({ owner: (req.user as any)._id });
        filter.shop = { $in: shops.map((s: any) => s._id) };
      } // ADMIN sees all

      const orders = await Order.find(filter)
        .populate('shop', 'name address isActive')
        .populate('customer', 'name fullName phone email')
        .populate('rider', 'name fullName phone vehicleNumber rating')
        .populate('items.product', 'name price image stockCount isActive')
        .sort({ createdAt: -1 });
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const order = await OrderController.getPopulatedOrder(req.params.id as string);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      
      // Role Isolation — handle both populated objects and raw ObjectIds
      const customerId = (order.customer as any)?._id?.toString() || order.customer?.toString();
      const riderId = (order.rider as any)?._id?.toString() || order.rider?.toString();
      const shopId = (order.shop as any)?._id?.toString() || order.shop?.toString();
      if (req.user.role === 'CUSTOMER' && customerId !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (req.user.role === 'RIDER' && riderId !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (req.user.role === 'SHOP_OWNER') {
        const { Shop } = await import('../shop/shop.model');
        const shops = await Shop.find({ owner: (req.user as any)._id });
        const shopIds = shops.map((s: any) => s._id.toString());
        if (!shopIds.includes(shopId)) {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      }

      const orderObj = order.toObject();
      const isCustomer = req.user.role === 'CUSTOMER';
      const isReadyForDelivery = order.status === OrderStatus.OUT_FOR_DELIVERY || order.status === OrderStatus.ARRIVED;
      
      res.json({ success: true, data: orderObj });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const { status, rejectionReason } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      const originalStatus = order.status;

      // Role isolation
      if (req.user.role === 'CUSTOMER' && status !== OrderStatus.CANCELLED) {
        return res.status(403).json({ success: false, message: 'Customers can only cancel orders' });
      }

      if (req.user.role === 'RIDER' && order.rider?.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not assigned to this order' });
      }
      
      if (req.user.role === 'SHOP_OWNER') {
        const { Shop } = await import('../shop/shop.model');
        const shops = await Shop.find({ owner: (req.user as any)._id });
        const shopIds = shops.map((s: any) => s._id.toString());
        const orderShopId = order.shop?.toString();
        if (!shopIds.includes(orderShopId)) {
          return res.status(403).json({ success: false, message: 'Not authorized for this shop' });
        }
      }

      if (!VALID_TRANSITIONS[order.status as OrderStatus].includes(status as OrderStatus)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid state transition from ${order.status} to ${status}` 
        });
      }

      if (status === OrderStatus.DELIVERED) {
        if (order.paymentMethod === 'COD' && order.paymentStatus !== 'COLLECTED') {
          return res.status(400).json({ success: false, message: 'Cannot mark DELIVERED: COD payment is not collected' });
        }
        if (order.deliveryVerificationStatus !== 'OTP_VERIFIED') {
          return res.status(400).json({ success: false, message: 'Cannot mark DELIVERED: OTP is not verified' });
        }
      }

      order.status = status;
      if (status === OrderStatus.OUT_FOR_DELIVERY) {
        if (!order.encryptedOtp || !order.deliveryOtpHash) {
          try {
            const { OtpService } = require('./otp.service');
            await OtpService.generateUniqueDeliveryOtp(order._id);
            // Reload order properties
            const updated = await Order.findById(order._id).select('+encryptedOtp +deliveryOtpHash');
            if (updated) {
              order.encryptedOtp = updated.encryptedOtp;
              order.deliveryOtpHash = updated.deliveryOtpHash;
              order.deliveryOtpExpiry = updated.deliveryOtpExpiry;
              order.deliveryOtpAttempts = updated.deliveryOtpAttempts;
              order.deliveryVerificationStatus = updated.deliveryVerificationStatus;
            }
          } catch (e) {
            console.error('Failed to generate unique OTP on manual status update:', e);
            return res.status(500).json({ success: false, message: 'Failed to generate Delivery OTP. Cannot transition to Out for Delivery.' });
          }
        }
      }
      if (status === OrderStatus.DELIVERED) {
        order.encryptedOtp = undefined;
        order.deliveryOtpHash = undefined;
        (order as any).deliveredAt = new Date();
        order.paymentStatus = 'COLLECTED';
        
        const { OtpService } = require('./otp.service');
        await OtpService.releaseOtp(order._id);
      } else if (status === OrderStatus.REJECTED || status === OrderStatus.CANCELLED || status === OrderStatus.DELIVERY_FAILED) {
        if (status === OrderStatus.REJECTED) {
          order.rejectedAt = new Date();
          order.rejectedBy = (req.user as any)._id;
          order.rejectionReason = rejectionReason || 'Unable to fulfil order';
        }
        
        const { OtpService } = require('./otp.service');
        await OtpService.releaseOtp(order._id);
        
        // Release rider if assigned
        if (order.rider) {
          try {
            const { RiderProfile, RiderAvailability } = require('../rider/rider.model');
            await RiderProfile.updateOne(
              { user: order.rider },
              { availabilityStatus: RiderAvailability.AVAILABLE, currentDelivery: null }
            );
          } catch (e) {
            console.error('Error freeing up rider on rejection/cancellation', e);
          }
        }
        
        // Restock inventory
        // Avoid double restocking by checking if it was already in a terminal failed state
        if (originalStatus !== OrderStatus.REJECTED && originalStatus !== OrderStatus.CANCELLED && originalStatus !== OrderStatus.DELIVERY_FAILED) {
          try {
            const { Product } = require('../catalog/catalog.model');
            for (const item of order.items) {
              await Product.updateOne(
                { _id: item.product },
                { $inc: { stockCount: item.quantity } }
              );
            }
          } catch (e) {
            console.error('Error restocking items', e);
          }
        }
      }

      order.statusHistory.push({
        status: status,
        changedAt: new Date(),
        changedBy: (req.user as any)._id
      });
      await order.save();

      if (status === OrderStatus.DELIVERED && order.rider) {
        try {
          const { RiderProfile, RiderAvailability } = require('../rider/rider.model');
          await RiderProfile.updateOne(
            { user: order.rider },
            { availabilityStatus: RiderAvailability.AVAILABLE, currentDelivery: null }
          );
        } catch (e) {
          console.error('Error freeing up rider', e);
        }
      }

      const event = new OrderEvent({
        order: order._id,
        status: status,
        notes: `Status updated to ${status} by ${req.user.role}`,
        triggeredBy: (req.user as any)._id
      });
      await event.save();

      try {
        const { getIO } = require('../../config/socket');
        getIO().to('admin_deliveries').emit('order_status_update', { orderId: order._id, status });
        getIO().to(`order_${order._id}`).emit('tracking_update', { status });
      } catch (e) {
        console.error('Socket emission failed', e);
      }

      const populatedOrder = await OrderController.getPopulatedOrder(order._id as string);
      res.json({ success: true, data: populatedOrder });
    } catch (error: any) {
      console.error('[UPDATE_ORDER_STATUS_ERROR]', error);
      res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const otp = String(req.body.otp ?? '').trim();
      
      if (!/^[0-9]{4}$/.test(otp)) {
        return res.status(400).json({ success: false, message: 'OTP must be exactly 4 digits' });
      }

      const order = await Order.findById(req.params.id).select('+deliveryOtpHash +deliveryOtpAttempts +deliveryOtpExpiry');
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      // Only RIDER or ADMIN can verify
      if (req.user.role !== 'RIDER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only riders can verify OTP' });
      }
      if (req.user.role === 'RIDER' && order.rider?.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not assigned to this order' });
      }

      if (order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.ARRIVED) {
        return res.status(400).json({ success: false, message: 'Order is not ready for delivery' });
      }

      if (order.deliveryVerificationStatus === 'OTP_VERIFIED') {
        return res.status(400).json({ success: false, message: 'OTP already verified' });
      }

      if (order.deliveryOtpAttempts >= 5) {
        return res.status(400).json({ success: false, message: 'Max OTP attempts reached. Order locked.' });
      }

      if (order.deliveryOtpExpiry && new Date() > order.deliveryOtpExpiry) {
        return res.status(400).json({ success: false, message: 'Delivery OTP expired' });
      }

      if (!order.deliveryOtpHash) {
        return res.status(500).json({ success: false, message: 'OTP not configured for order' });
      }

      const isValid = await bcrypt.compare(otp.toString(), order.deliveryOtpHash);
      if (!isValid) {
        order.deliveryOtpAttempts += 1;
        await order.save();
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }

      order.deliveryVerificationStatus = 'OTP_VERIFIED';
      await order.save();

      const populatedOrder = await OrderController.getPopulatedOrder(order._id as string);
      res.json({ success: true, data: populatedOrder, message: 'OTP Verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async deliverOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      // Only RIDER or ADMIN can deliver
      if (req.user.role !== 'RIDER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only riders can deliver' });
      }
      if (req.user.role === 'RIDER' && order.rider?.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not assigned to this order' });
      }

      if (order.status !== OrderStatus.ARRIVED && order.status !== OrderStatus.OUT_FOR_DELIVERY) {
        return res.status(400).json({ success: false, message: 'Rider must arrive at the customer doorstep before completing delivery.' });
      }

      if (order.deliveryVerificationStatus !== 'OTP_VERIFIED') {
        return res.status(400).json({ success: false, message: 'Customer delivery OTP must be verified before completing delivery.' });
      }

      if (order.paymentMethod === 'COD' && order.paymentStatus !== 'COLLECTED') {
        return res.status(400).json({ success: false, message: 'COD payment must be collected before completing delivery.' });
      }

      // Valid OTP and Payment => Deliver
      order.status = OrderStatus.DELIVERED;
      
      order.encryptedOtp = undefined;
      order.deliveryOtpHash = undefined;
      (order as any).deliveredAt = new Date();
      
      const { OtpService } = require('./otp.service');
      await OtpService.releaseOtp(order._id);

      order.statusHistory.push({
        status: OrderStatus.DELIVERED,
        changedAt: new Date(),
        changedBy: (req.user as any)._id
      });

      await order.save();

      try {
        const { RiderProfile, RiderAvailability } = require('../rider/rider.model');
        await RiderProfile.updateOne(
          { user: order.rider },
          { availabilityStatus: RiderAvailability.AVAILABLE, currentDelivery: null }
        );
      } catch (e) {
        console.error('Error freeing up rider', e);
      }

      const event = new OrderEvent({
        order: order._id,
        status: OrderStatus.DELIVERED,
        notes: 'Order delivered successfully',
        triggeredBy: (req.user as any)._id
      });
      await event.save();

      const populatedOrder = await OrderController.getPopulatedOrder(order._id as string);
      res.json({ success: true, data: populatedOrder, message: 'Delivery Completed Successfully.' });
    } catch (error) {
      next(error);
    }
  }

  static async updateTracking(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const { location } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      // Only RIDER can update tracking for their order
      if (req.user.role !== 'RIDER') {
        return res.status(403).json({ success: false, message: 'Only riders can update tracking' });
      }
      if (order.rider?.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not assigned to this order' });
      }

      order.tracking = {
        location,
        updatedAt: new Date()
      };
      await order.save();

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  static async getTracking(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });

      const order = await Order.findById(req.params.id)
        .populate('rider', 'firstName lastName phone vehicleNumber vehicleType rating')
        .populate('shop', 'address');
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      // Role isolation
      if (req.user.role === 'CUSTOMER' && order.customer.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (req.user.role === 'RIDER' && order.rider?.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (req.user.role === 'SHOP_OWNER') {
        const { Shop } = await import('../shop/shop.model');
        const shops = await Shop.find({ owner: (req.user as any)._id });
        const shopIds = shops.map((s: any) => s._id.toString());
        const orderShopId = order.shop?.toString();
        // Since shop is populated in getTracking, we need to handle populated object or string
        const actualShopId = (order.shop as any)?._id?.toString() || orderShopId;
        if (!shopIds.includes(actualShopId)) {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      }

      const isDev = process.env.NODE_ENV !== 'production';
      const shopAny = order.shop as any;

      res.json({ 
        success: true, 
        data: {
          orderId: order._id,
          status: order.status,
          trackingState: order.status === OrderStatus.OUT_FOR_DELIVERY ? 'TRACKING_ACTIVE' : (order.status === OrderStatus.DELIVERED ? 'DELIVERED' : 'PENDING'),
          rider: order.rider,
          hubLocation: shopAny?.address,
          customerLocation: order.deliveryAddress,
          tracking: order.tracking
        } 
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const { paymentStatus } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      // Only RIDER or ADMIN can update payment status
      if (req.user.role !== 'RIDER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Only riders can update payment' });
      }
      if (req.user.role === 'RIDER' && order.rider?.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not assigned to this order' });
      }

      if (order.paymentMethod !== 'COD') {
        return res.status(400).json({ success: false, message: 'Can only update payment status for COD orders manually' });
      }

      order.paymentStatus = paymentStatus;
      await order.save();

      const event = new OrderEvent({
        order: order._id,
        status: order.status,
        notes: `Payment status updated to ${paymentStatus}`,
        triggeredBy: (req.user as any)._id
      });
      await event.save();

      const populatedOrder = await OrderController.getPopulatedOrder(order._id as string);
      res.json({ success: true, data: populatedOrder });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerOtp(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const order = await Order.findById(req.params.id).select('+encryptedOtp');
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      if (order.customer.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      if (order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.ARRIVED) {
        return res.status(400).json({ success: false, message: 'OTP is not yet available' });
      }

      if (!order.encryptedOtp) {
        return res.status(400).json({ success: false, message: 'OTP missing or already verified' });
      }

      const otp = decryptOtp(order.encryptedOtp);

      res.json({ success: true, data: { deliveryOtp: otp } });
    } catch (error) {
      next(error);
    }
  }

  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'RIDER') {
        return res.status(403).json({ success: false, message: 'Only riders can resend OTP' });
      }

      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      if (order.rider?.toString() !== (req.user as any)._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not assigned to this order' });
      }

      if (order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.ARRIVED) {
        return res.status(400).json({ success: false, message: 'Order is not out for delivery' });
      }

      if (order.deliveryVerificationStatus === 'OTP_VERIFIED') {
        return res.status(400).json({ success: false, message: 'OTP already verified' });
      }

      const { OtpService } = require('./otp.service');
      await OtpService.generateUniqueDeliveryOtp(order._id, undefined, true);

      return res.json({ success: true, message: 'New OTP generated successfully' });
    } catch (error) {
      next(error);
    }
  }
}
