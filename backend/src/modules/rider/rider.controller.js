'use strict';

const { RiderProfile, RiderLocation, RiderAvailability, VehicleType } = require('./rider.model');
const { Order, OrderStatus } = require('../order/order.model');
const { User } = require('../auth/auth.model');
const OrderService = require('../order/order.service');
const { emitOrderUpdate, emitRiderLocation } = require('../../config/socket');
const { runInTransaction } = require('../../utils/transaction');
const { parseLatLng } = require('../../utils/geo');
const { startOfDayIST } = require('../../utils/time');
const { z, objectId } = require('../../utils/validation');
const { notFound, conflict, forbidden } = require('../../utils/http-error');
const { AuthService } = require('../auth/auth.service');

const TRACKABLE_STATUSES = [OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.ARRIVED];

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().min(0).optional().nullable(),
  speed: z.number().optional().nullable(),
  heading: z.number().optional().nullable(),
  timestamp: z.union([z.number(), z.string()]).optional(),
  orderId: objectId.optional().nullable()
});

const vehicleSchema = z.object({
  vehicleType: z.enum(VehicleType),
  vehicleNumber: z.string().trim().min(4, 'Enter a valid vehicle number').max(20),
  licenseNumber: z.string().trim().max(30).optional().or(z.literal(''))
});

async function loadProfile(userId) {
  const profile = await RiderProfile.findOne({ user: userId });
  if (!profile) throw notFound('Rider profile not found. Contact the platform admin.', 'NO_RIDER_PROFILE');
  return profile;
}

class RiderController {
  static async getProfile(req, res) {
    const profile = await loadProfile(req.user._id);
    const today = startOfDayIST();
    const [todayStats] = await Order.aggregate([
      { $match: { rider: req.user._id, status: OrderStatus.DELIVERED, deliveredAt: { $gte: today } } },
      { $group: { _id: null, deliveries: { $sum: 1 }, cashCollected: { $sum: '$totalAmount' } } }
    ]);
    res.json({
      success: true,
      data: {
        ...profile.toJSON(),
        user: AuthService.toPublicUser(req.user),
        todayDeliveries: todayStats ? todayStats.deliveries : 0,
        todayCashCollected: todayStats ? todayStats.cashCollected : 0
      }
    });
  }

  static async updateVehicle(req, res) {
    const data = vehicleSchema.parse(req.body);
    const profile = await loadProfile(req.user._id);
    profile.set({ ...data, licenseNumber: data.licenseNumber || undefined });
    await profile.save();
    res.json({ success: true, data: profile });
  }

  /** Riders toggle between AVAILABLE and OFFLINE; BUSY is controlled by order assignment. */
  static async setAvailability(req, res) {
    const { status } = z.object({ status: z.enum([RiderAvailability.AVAILABLE, RiderAvailability.OFFLINE]) }).parse(req.body);
    const profile = await RiderProfile.findOneAndUpdate(
      { user: req.user._id, currentOrder: null },
      { $set: { availabilityStatus: status } },
      { new: true }
    );
    if (!profile) {
      if (!(await RiderProfile.exists({ user: req.user._id }))) throw notFound('Rider profile not found', 'NO_RIDER_PROFILE');
      throw conflict('Finish your current delivery before changing availability', 'RIDER_BUSY');
    }
    res.json({ success: true, data: profile });
  }

  static async getActiveOrder(req, res) {
    const profile = await loadProfile(req.user._id);
    if (!profile.currentOrder) return res.json({ success: true, data: null });
    res.json({ success: true, data: await OrderService.populateOrder(profile.currentOrder) });
  }

  static async pickupOrder(req, res) {
    const order = await runInTransaction(async (session) => {
      const doc = await OrderService.loadOrder(req.params.id, { session });
      if (!doc.rider || String(doc.rider) !== String(req.user._id)) throw forbidden('You are not assigned to this order');
      return OrderService.markPickedUp({ order: doc, user: req.user, session });
    });
    emitOrderUpdate(order);
    res.json({ success: true, data: await OrderService.populateOrder(order), message: 'Order picked up' });
  }

  static async updateLocation(req, res) {
    const data = locationSchema.parse(req.body);
    const { lat, lng } = parseLatLng(data.latitude, data.longitude);
    const recordedAt = data.timestamp ? new Date(data.timestamp) : new Date();
    const at = Number.isNaN(recordedAt.getTime()) || recordedAt > new Date(Date.now() + 60000) ? new Date() : recordedAt;

    let trackedOrderId = null;
    if (data.orderId) {
      const order = await Order.findOne({ _id: data.orderId, rider: req.user._id, status: { $in: TRACKABLE_STATUSES } }).select('_id');
      if (order) trackedOrderId = order._id;
    }

    await Promise.all([
      RiderLocation.create({ rider: req.user._id, order: trackedOrderId || undefined, lat, lng, accuracy: data.accuracy, speed: data.speed, heading: data.heading, recordedAt: at }),
      RiderProfile.updateOne({ user: req.user._id }, { $set: { lastLocation: { lat, lng, at } } }),
      trackedOrderId ? Order.updateOne({ _id: trackedOrderId }, { $set: { tracking: { lat, lng, updatedAt: at } } }) : null
    ]);

    if (trackedOrderId) {
      emitRiderLocation(trackedOrderId, {
        riderId: String(req.user._id),
        orderId: String(trackedOrderId),
        latitude: lat,
        longitude: lng,
        accuracy: data.accuracy,
        speed: data.speed,
        heading: data.heading,
        timestamp: at
      });
    }
    res.json({ success: true, tracked: Boolean(trackedOrderId) });
  }

  // ---------- Fleet view for dispatchers (ADMIN, EMPLOYEE riders.read/orders.manage, SHOP_OWNER) ----------

  static async listFleet(req, res) {
    const profiles = await RiderProfile.find().populate('user', 'name phone isActive').lean();
    const riders = profiles
      .filter((p) => p.user && p.user.isActive)
      .map((p) => ({
        id: String(p.user._id),
        name: p.user.name,
        phone: p.user.phone,
        vehicleType: p.vehicleType,
        vehicleNumber: p.vehicleNumber,
        availabilityStatus: p.availabilityStatus,
        currentOrder: p.currentOrder,
        completedDeliveries: p.completedDeliveries,
        lastLocation: p.lastLocation
      }))
      .sort((a, b) => a.availabilityStatus.localeCompare(b.availabilityStatus) || (a.name || '').localeCompare(b.name || ''));
    res.json({ success: true, data: riders });
  }
}

/** Creates a rider account and profile atomically. Used by the admin user-management screen. */
async function createRiderAccount({ name, phone, passwordHash, vehicleType, vehicleNumber, licenseNumber }) {
  return runInTransaction(async (session) => {
    const [user] = await User.create(
      [{ name, phone, passwordHash, role: 'RIDER', profileComplete: true, mustChangePassword: true }],
      { session }
    );
    await RiderProfile.create(
      [{ user: user._id, vehicleType, vehicleNumber, licenseNumber: licenseNumber || undefined, availabilityStatus: RiderAvailability.OFFLINE }],
      { session }
    );
    return user;
  });
}

module.exports = { RiderController, createRiderAccount };
