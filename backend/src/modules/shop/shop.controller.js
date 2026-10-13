'use strict';

const mongoose = require('mongoose');
const { Shop, TIME_REGEX } = require('./shop.model');
const { User, UserRole } = require('../auth/auth.model');
const { Order, OrderStatus } = require('../order/order.model');
const { Product } = require('../catalog/catalog.model');
const { Settings } = require('../admin/settings.model');
const { recordAudit, AuditAction } = require('../admin/audit.model');
const { z, phone, password, assertObjectId } = require('../../utils/validation');
const { hashPassword } = require('../../utils/auth');
const { parseLatLng } = require('../../utils/geo');
const { startOfDayIST, daysAgo } = require('../../utils/time');
const { notFound, conflict, badRequest } = require('../../utils/http-error');

const addressSchema = z.object({
  street: z.string().trim().min(1, 'Street is required').max(200),
  area: z.string().trim().max(120).optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required').max(80),
  state: z.string().trim().min(1, 'State is required').max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits')
});

const shopFields = {
  name: z.string().trim().min(1, 'Store name is required').max(120),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  phone: phone.optional().or(z.literal('')),
  address: addressSchema,
  location: z.object({ lat: z.number(), lng: z.number() }),
  openTime: z.string().regex(TIME_REGEX, 'Opening time must be HH:MM'),
  closeTime: z.string().regex(TIME_REGEX, 'Closing time must be HH:MM'),
  deliveryRadiusKm: z.number().min(0.5).max(50).optional(),
  imageUrl: z.string().trim().url('Image must be a valid URL').optional().or(z.literal('')),
  isAcceptingOrders: z.boolean().optional()
};

const createShopSchema = z.object({
  ...shopFields,
  owner: z.union([
    z.object({ id: z.string() }),
    z.object({ name: z.string().trim().min(1, 'Owner name is required').max(100), phone, password })
  ])
});

const adminUpdateShopSchema = z.object({ ...shopFields, isActive: z.boolean().optional() }).partial();

// Shop owners may change how their store operates, but not its location or legal identity.
const ownerUpdateShopSchema = z
  .object({
    name: shopFields.name,
    description: shopFields.description,
    phone: shopFields.phone,
    openTime: shopFields.openTime,
    closeTime: shopFields.closeTime,
    isAcceptingOrders: z.boolean(),
    imageUrl: shopFields.imageUrl
  })
  .partial();

function normalizeShopInput(data) {
  const out = { ...data };
  if (data.location) out.location = parseLatLng(data.location.lat, data.location.lng);
  if (out.openTime && out.closeTime && out.openTime === out.closeTime) {
    throw badRequest('Opening and closing times cannot be the same', 'INVALID_HOURS');
  }
  return out;
}

const PUBLIC_FIELDS = 'name description address location openTime closeTime isAcceptingOrders imageUrl deliveryRadiusKm';

async function findOwnShop(userId) {
  const shop = await Shop.findOne({ owner: userId });
  if (!shop) throw notFound('No store is linked to your account. Contact the platform admin.', 'NO_SHOP');
  return shop;
}

async function computeShopMetrics(shopId) {
  const today = startOfDayIST();
  const since30 = daysAgo(30);
  const settings = await Settings.getSingleton();
  const shop = new mongoose.Types.ObjectId(String(shopId));

  const [statusCounts, todayStats, monthStats, lowStock] = await Promise.all([
    Order.aggregate([
      { $match: { shop, status: { $nin: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REJECTED] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Order.aggregate([
      { $match: { shop, createdAt: { $gte: today } } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          cancelled: { $sum: { $cond: [{ $in: ['$status', [OrderStatus.CANCELLED, OrderStatus.REJECTED]] }, 1, 0] } },
          deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, '$totalAmount', 0] } }
        }
      }
    ]),
    Order.aggregate([
      { $match: { shop, status: OrderStatus.DELIVERED, deliveredAt: { $gte: since30 } } },
      {
        $group: {
          _id: null,
          completed: { $sum: 1 },
          sales: { $sum: '$totalAmount' },
          avgFulfillmentMs: { $avg: { $cond: [{ $ifNull: ['$readyAt', false] }, { $subtract: ['$readyAt', '$createdAt'] }, null] } },
          avgDeliveryMs: { $avg: { $subtract: ['$deliveredAt', '$createdAt'] } }
        }
      }
    ]),
    Product.find({ shop, isActive: true, stockCount: { $lte: settings.lowStockThreshold } })
      .select('name unit stockCount sku')
      .sort({ stockCount: 1 })
      .limit(10)
      .lean()
  ]);

  const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const t = todayStats[0] || { orders: 0, cancelled: 0, deliveredRevenue: 0 };
  const m = monthStats[0] || { completed: 0, sales: 0, avgFulfillmentMs: null, avgDeliveryMs: null };
  const toMinutes = (ms) => (ms == null ? null : Math.round(ms / 60000));

  return {
    todayOrders: t.orders,
    todayCancelled: t.cancelled,
    todayRevenue: t.deliveredRevenue,
    pendingOrders: counts[OrderStatus.PENDING] || 0,
    acceptedOrders: counts[OrderStatus.ACCEPTED] || 0,
    preparingOrders: counts[OrderStatus.PREPARING] || 0,
    readyOrders: counts[OrderStatus.READY] || 0,
    inDeliveryOrders:
      (counts[OrderStatus.ASSIGNED] || 0) +
      (counts[OrderStatus.PICKED_UP] || 0) +
      (counts[OrderStatus.OUT_FOR_DELIVERY] || 0) +
      (counts[OrderStatus.ARRIVED] || 0) +
      (counts[OrderStatus.DELIVERY_FAILED] || 0),
    last30Days: {
      completedOrders: m.completed,
      sales: m.sales,
      avgTicketSize: m.completed ? Math.round(m.sales / m.completed) : 0,
      avgFulfillmentMinutes: toMinutes(m.avgFulfillmentMs),
      avgDeliveryMinutes: toMinutes(m.avgDeliveryMs)
    },
    lowStockThreshold: settings.lowStockThreshold,
    lowStockProducts: lowStock
  };
}

class ShopController {
  // ---------- Public ----------

  static async listPublic(req, res) {
    const shops = await Shop.find({ isActive: true }).select(PUBLIC_FIELDS).sort({ name: 1 }).lean();
    res.json({ success: true, data: shops });
  }

  // ---------- Shop owner ----------

  static async getMine(req, res) {
    const shop = await findOwnShop(req.user._id);
    res.json({ success: true, data: shop });
  }

  static async updateMine(req, res) {
    const shop = await findOwnShop(req.user._id);
    const data = normalizeShopInput(ownerUpdateShopSchema.parse(req.body));
    shop.set(data);
    await shop.save();
    await recordAudit(req, AuditAction.UPDATE, 'Shop', shop._id, Object.keys(data));
    res.json({ success: true, data: shop });
  }

  static async getMyMetrics(req, res) {
    const shop = await findOwnShop(req.user._id);
    res.json({ success: true, data: await computeShopMetrics(shop._id) });
  }

  // ---------- Admin ----------

  static async adminList(req, res) {
    const today = startOfDayIST();
    const [shops, todayByShop] = await Promise.all([
      Shop.find().populate('owner', 'name phone email role isActive').sort({ createdAt: -1 }).lean(),
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: '$shop',
            orders: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, '$totalAmount', 0] } }
          }
        }
      ])
    ]);
    const byShop = new Map(todayByShop.map((r) => [String(r._id), r]));
    res.json({
      success: true,
      data: shops.map((s) => ({
        ...s,
        todayOrders: (byShop.get(String(s._id)) || {}).orders || 0,
        todayRevenue: (byShop.get(String(s._id)) || {}).revenue || 0
      }))
    });
  }

  static async adminGet(req, res) {
    assertObjectId(req.params.id, 'shop id');
    const shop = await Shop.findById(req.params.id).populate('owner', 'name phone email role isActive');
    if (!shop) throw notFound('Store not found');
    res.json({ success: true, data: { shop, metrics: await computeShopMetrics(shop._id) } });
  }

  static async adminCreate(req, res) {
    const { owner, ...rest } = createShopSchema.parse(req.body);
    const data = normalizeShopInput(rest);

    let ownerId;
    if (owner.id) {
      assertObjectId(owner.id, 'owner id');
      const existing = await User.findOne({ _id: owner.id, role: { $in: [UserRole.SHOP_OWNER, UserRole.ADMIN] }, isActive: true });
      if (!existing) throw badRequest('Owner must be an active shop owner or admin account', 'INVALID_OWNER');
      ownerId = existing._id;
    } else {
      if (await User.exists({ phone: owner.phone })) {
        throw conflict('An account with this mobile number already exists', 'PHONE_TAKEN');
      }
      const created = await User.create({
        name: owner.name,
        phone: owner.phone,
        passwordHash: await hashPassword(owner.password),
        role: UserRole.SHOP_OWNER,
        profileComplete: true,
        mustChangePassword: true
      });
      ownerId = created._id;
      await recordAudit(req, AuditAction.CREATE, 'User', created._id, { role: UserRole.SHOP_OWNER });
    }

    const shop = await Shop.create({ ...data, owner: ownerId });
    await recordAudit(req, AuditAction.CREATE, 'Shop', shop._id, { name: shop.name });
    res.status(201).json({ success: true, data: await shop.populate('owner', 'name phone email role isActive') });
  }

  static async adminUpdate(req, res) {
    assertObjectId(req.params.id, 'shop id');
    const shop = await Shop.findById(req.params.id);
    if (!shop) throw notFound('Store not found');
    const data = normalizeShopInput(adminUpdateShopSchema.parse(req.body));
    shop.set(data);
    await shop.save();
    await recordAudit(req, AuditAction.UPDATE, 'Shop', shop._id, Object.keys(data));
    res.json({ success: true, data: await shop.populate('owner', 'name phone email role isActive') });
  }
}

module.exports = { ShopController, computeShopMetrics };
