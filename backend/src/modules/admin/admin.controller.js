'use strict';

const { Order, OrderStatus, PaymentStatus, ACTIVE_DELIVERY_STATUSES } = require('../order/order.model');
const { User, UserRole, PERMISSIONS } = require('../auth/auth.model');
const { Shop } = require('../shop/shop.model');
const { RiderProfile, RiderAvailability, VehicleType } = require('../rider/rider.model');
const { Settings } = require('./settings.model');
const { AuditLog, AuditAction, recordAudit } = require('./audit.model');
const { createRiderAccount } = require('../rider/rider.controller');
const { AuthService } = require('../auth/auth.service');
const { ORDER_POPULATE } = require('../order/order.service');
const { hashPassword } = require('../../utils/auth');
const { escapeRegExp } = require('../../utils/regex');
const { startOfDayIST, daysAgo } = require('../../utils/time');
const { z, phone, password, assertObjectId, parsePagination, parseSearch } = require('../../utils/validation');
const { notFound, conflict, forbidden } = require('../../utils/http-error');

const CLOSED = [OrderStatus.CANCELLED, OrderStatus.REJECTED];
const IN_PROGRESS = Object.values(OrderStatus).filter((s) => ![OrderStatus.DELIVERED, ...CLOSED].includes(s));

const PERIODS = { today: () => startOfDayIST(), 'this-week': () => daysAgo(7), 'this-month': () => daysAgo(30) };

const riderCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone,
  password,
  vehicleType: z.enum(VehicleType),
  vehicleNumber: z.string().trim().min(4, 'Enter a valid vehicle number').max(20),
  licenseNumber: z.string().trim().max(30).optional().or(z.literal(''))
});

const riderUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone,
    vehicleType: z.enum(VehicleType),
    vehicleNumber: z.string().trim().min(4).max(20),
    licenseNumber: z.string().trim().max(30).or(z.literal(''))
  })
  .partial();

const employeeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  phone,
  email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
  permissions: z.array(z.enum(PERMISSIONS)).default([])
});

const employeeUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone,
    email: z.string().trim().toLowerCase().email().or(z.literal('')),
    permissions: z.array(z.enum(PERMISSIONS)),
    isActive: z.boolean()
  })
  .partial();

const settingsSchema = z.object({
  freeDeliveryThreshold: z.number().min(0).max(100000),
  baseDeliveryFee: z.number().min(0).max(100000),
  platformHandlingFee: z.number().min(0).max(100000),
  deliverySlaMinutes: z.number().int().min(1).max(600),
  lowStockThreshold: z.number().int().min(0).max(100000),
  supportPhone: phone.or(z.literal('')),
  supportEmail: z.string().trim().toLowerCase().email('Enter a valid support email').or(z.literal('')),
  billing: z
    .object({
      businessName: z.string().trim().max(120),
      businessAddress: z.string().trim().max(300),
      businessPhone: z.string().trim().max(20),
      gstin: z.string().trim().toUpperCase().regex(/^([0-9A-Z]{15})?$/, 'GSTIN must be 15 letters/digits'),
      invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,10}$/, 'Prefix: 1-10 letters, digits or -'),
      taxMode: z.enum(['NONE', 'EXCLUSIVE', 'INCLUSIVE']),
      defaultTaxRate: z.number().min(0).max(100),
      taxLabel: z.string().trim().min(1).max(20),
      gstSplit: z.enum(['NONE', 'CGST_SGST', 'IGST']),
      roundTotal: z.boolean(),
      paymentTermsDays: z.number().int().min(0).max(365),
      allowNegativeStock: z.boolean(),
      invoiceFooter: z.string().trim().max(300)
    })
    .partial()
}).partial();

async function assertPhoneFree(phoneNumber, exceptId) {
  const filter = { phone: phoneNumber };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await User.exists(filter)) throw conflict('An account with this mobile number already exists', 'PHONE_TAKEN');
}

async function assertEmailFree(email, exceptId) {
  if (!email) return;
  const filter = { email };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await User.exists(filter)) throw conflict('An account with this email already exists', 'EMAIL_TAKEN');
}

class AdminController {
  // ---------- Dashboard & reports ----------

  static async getDashboardStats(req, res) {
    const today = startOfDayIST();
    const since30 = daysAgo(30);

    const [orderTotals, todayTotals, deliveryPerf, customers, riders, shops] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            activeOrders: { $sum: { $cond: [{ $in: ['$status', IN_PROGRESS] }, 1, 0] } },
            inDelivery: { $sum: { $cond: [{ $in: ['$status', [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.ARRIVED]] }, 1, 0] } },
            deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, '$totalAmount', 0] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            cancelled: { $sum: { $cond: [{ $in: ['$status', CLOSED] }, 1, 0] } },
            bookedValue: { $sum: { $cond: [{ $in: ['$status', CLOSED] }, 0, '$totalAmount'] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: { status: OrderStatus.DELIVERED, deliveredAt: { $gte: since30 } } },
        { $group: { _id: null, count: { $sum: 1 }, avgMs: { $avg: { $subtract: ['$deliveredAt', '$createdAt'] } } } }
      ]),
      User.countDocuments({ role: UserRole.CUSTOMER }),
      RiderProfile.aggregate([{ $group: { _id: '$availabilityStatus', count: { $sum: 1 } } }]),
      Shop.aggregate([{ $group: { _id: '$isActive', count: { $sum: 1 } } }])
    ]);

    const totals = orderTotals[0] || { totalOrders: 0, activeOrders: 0, inDelivery: 0, deliveredRevenue: 0 };
    const t = todayTotals[0] || { orders: 0, cancelled: 0, bookedValue: 0 };
    const perf = deliveryPerf[0];
    const riderCounts = Object.fromEntries(riders.map((r) => [r._id, r.count]));
    const shopCounts = Object.fromEntries(shops.map((s) => [String(s._id), s.count]));

    res.json({
      success: true,
      data: {
        totalOrders: totals.totalOrders,
        activeOrders: totals.activeOrders,
        ordersInDelivery: totals.inDelivery,
        deliveredRevenue: totals.deliveredRevenue,
        todayOrders: t.orders,
        todayCancelled: t.cancelled,
        todayBookedValue: t.bookedValue,
        registeredCustomers: customers,
        riders: {
          available: riderCounts[RiderAvailability.AVAILABLE] || 0,
          busy: riderCounts[RiderAvailability.BUSY] || 0,
          offline: riderCounts[RiderAvailability.OFFLINE] || 0
        },
        shops: { active: shopCounts.true || 0, inactive: shopCounts.false || 0 },
        last30Days: {
          deliveredOrders: perf ? perf.count : 0,
          avgDeliveryMinutes: perf && perf.avgMs != null ? Math.round(perf.avgMs / 60000) : null
        }
      }
    });
  }

  static async getReports(req, res) {
    const period = PERIODS[req.query.period] ? req.query.period : 'today';
    const from = PERIODS[period]();
    const settings = await Settings.getSingleton();
    const slaMs = settings.deliverySlaMinutes * 60000;

    const [summary, byCategory, byStatus] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: from }, status: { $nin: CLOSED } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            sales: { $sum: '$totalAmount' },
            delivered: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, 1, 0] } },
            slaBreaches: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$status', OrderStatus.DELIVERED] }, { $gt: [{ $subtract: ['$deliveredAt', '$createdAt'] }, slaMs] }] },
                  1,
                  0
                ]
              }
            },
            avgDeliveryMs: { $avg: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, { $subtract: ['$deliveredAt', '$createdAt'] }, null] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from }, status: { $nin: CLOSED } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product', pipeline: [{ $project: { category: 1 } }] } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category', pipeline: [{ $project: { name: 1 } }] } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$category.name', 'Uncategorised'] },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            units: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      Order.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const s = summary[0] || { orders: 0, sales: 0, delivered: 0, slaBreaches: 0, avgDeliveryMs: null };
    const itemsRevenue = byCategory.reduce((sum, c) => sum + c.revenue, 0);
    res.json({
      success: true,
      data: {
        period,
        from,
        totalOrders: s.orders,
        totalSales: s.sales,
        avgOrderValue: s.orders ? Math.round(s.sales / s.orders) : 0,
        deliveredOrders: s.delivered,
        avgDeliveryMinutes: s.avgDeliveryMs != null ? Math.round(s.avgDeliveryMs / 60000) : null,
        slaMinutes: settings.deliverySlaMinutes,
        slaBreaches: s.slaBreaches,
        statusBreakdown: Object.fromEntries(byStatus.map((b) => [b._id, b.count])),
        categoryDistribution: byCategory.map((c) => ({
          category: c._id,
          revenue: c.revenue,
          units: c.units,
          share: itemsRevenue ? Math.round((c.revenue / itemsRevenue) * 1000) / 10 : 0
        }))
      }
    });
  }

  static async getPayments(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
    const filter = { status: { $nin: CLOSED } };
    if (req.query.paymentStatus && Object.values(PaymentStatus).includes(req.query.paymentStatus)) filter.paymentStatus = req.query.paymentStatus;

    const [rows, total, totals] = await Promise.all([
      Order.find(filter)
        .select('orderNumber customer rider totalAmount paymentMethod paymentStatus paymentCollectedAt status createdAt')
        .populate([{ path: 'customer', select: 'name phone' }, { path: 'rider', select: 'name' }])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate([{ $match: { status: { $nin: CLOSED } } }, { $group: { _id: '$paymentStatus', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }])
    ]);
    res.json({
      success: true,
      data: rows,
      summary: Object.fromEntries(totals.map((t) => [t._id, { amount: t.amount, count: t.count }])),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  }

  static async getActiveDeliveries(req, res) {
    const deliveries = await Order.find({ status: { $in: ACTIVE_DELIVERY_STATUSES } }).populate(ORDER_POPULATE).sort({ updatedAt: -1 }).limit(200).lean();
    res.json({ success: true, data: deliveries });
  }

  // ---------- Customers ----------

  static async getCustomers(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
    const search = parseSearch(req.query.search);
    const filter = { role: UserRole.CUSTOMER };
    if (search) {
      const rx = { $regex: escapeRegExp(search), $options: 'i' };
      filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }

    const [customers, total] = await Promise.all([
      User.find(filter).select('name phone email isActive createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter)
    ]);
    const stats = await Order.aggregate([
      { $match: { customer: { $in: customers.map((c) => c._id) } } },
      {
        $group: {
          _id: '$customer',
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, '$totalAmount', 0] } },
          lastOrderAt: { $max: '$createdAt' }
        }
      }
    ]);
    const byCustomer = new Map(stats.map((s) => [String(s._id), s]));
    res.json({
      success: true,
      data: customers.map((c) => {
        const s = byCustomer.get(String(c._id)) || {};
        return { ...c, id: String(c._id), orders: s.orders || 0, spent: s.spent || 0, lastOrderAt: s.lastOrderAt || null };
      }),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  }

  static async setUserActive(req, res) {
    assertObjectId(req.params.id, 'user id');
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const user = await User.findOne({ _id: req.params.id, role: UserRole.CUSTOMER });
    if (!user) throw notFound('Customer not found');
    user.isActive = isActive;
    if (!isActive) user.refreshTokenHash = undefined;
    await user.save();
    await recordAudit(req, AuditAction.UPDATE, 'User', user._id, { isActive });
    res.json({ success: true, data: { id: String(user._id), isActive: user.isActive } });
  }

  // ---------- Riders ----------

  static async getRiders(req, res) {
    const riders = await User.aggregate([
      { $match: { role: UserRole.RIDER } },
      { $lookup: { from: 'riderprofiles', localField: '_id', foreignField: 'user', as: 'profile' } },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          phone: 1,
          isActive: 1,
          mustChangePassword: 1,
          createdAt: 1,
          vehicleType: '$profile.vehicleType',
          vehicleNumber: '$profile.vehicleNumber',
          licenseNumber: '$profile.licenseNumber',
          availabilityStatus: { $ifNull: ['$profile.availabilityStatus', RiderAvailability.OFFLINE] },
          currentOrder: '$profile.currentOrder',
          completedDeliveries: { $ifNull: ['$profile.completedDeliveries', 0] },
          lastLocation: '$profile.lastLocation'
        }
      }
    ]);
    res.json({ success: true, data: riders });
  }

  static async createRider(req, res) {
    const data = riderCreateSchema.parse(req.body);
    await assertPhoneFree(data.phone);
    const user = await createRiderAccount({ ...data, passwordHash: await hashPassword(data.password) });
    await recordAudit(req, AuditAction.CREATE, 'Rider', user._id, { name: user.name, phone: user.phone });
    res.status(201).json({ success: true, data: { id: String(user._id) }, message: 'Rider created. They must change the initial password on first sign-in.' });
  }

  static async updateRider(req, res) {
    assertObjectId(req.params.id, 'rider id');
    const data = riderUpdateSchema.parse(req.body);
    const user = await User.findOne({ _id: req.params.id, role: UserRole.RIDER });
    if (!user) throw notFound('Rider not found');
    if (data.phone && data.phone !== user.phone) await assertPhoneFree(data.phone, user._id);

    if (data.name) user.name = data.name;
    if (data.phone) user.phone = data.phone;
    await user.save();

    const profileUpdate = {};
    ['vehicleType', 'vehicleNumber'].forEach((k) => {
      if (data[k] !== undefined) profileUpdate[k] = data[k];
    });
    if (data.licenseNumber !== undefined) profileUpdate.licenseNumber = data.licenseNumber || undefined;
    if (Object.keys(profileUpdate).length) {
      await RiderProfile.findOneAndUpdate({ user: user._id }, { $set: profileUpdate }, { runValidators: true });
    }
    await recordAudit(req, AuditAction.UPDATE, 'Rider', user._id, { fields: Object.keys(data) });
    res.json({ success: true, message: 'Rider updated' });
  }

  /** Riders are deactivated, never deleted, so delivery history keeps its references. */
  static async setRiderActive(req, res) {
    assertObjectId(req.params.id, 'rider id');
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const user = await User.findOne({ _id: req.params.id, role: UserRole.RIDER });
    if (!user) throw notFound('Rider not found');

    if (!isActive) {
      const busy = await RiderProfile.exists({ user: user._id, currentOrder: { $ne: null } });
      if (busy) throw conflict('This rider has an active delivery. Reassign or finish it first.', 'RIDER_BUSY');
      await RiderProfile.updateOne({ user: user._id }, { $set: { availabilityStatus: RiderAvailability.OFFLINE } });
      user.refreshTokenHash = undefined;
    }
    user.isActive = isActive;
    await user.save();
    await recordAudit(req, AuditAction.UPDATE, 'Rider', user._id, { isActive });
    res.json({ success: true, message: `Rider ${isActive ? 'activated' : 'deactivated'}` });
  }

  static async resetRiderPassword(req, res) {
    assertObjectId(req.params.id, 'rider id');
    const { password: newPassword } = z.object({ password }).parse(req.body);
    const user = await User.findOne({ _id: req.params.id, role: UserRole.RIDER });
    if (!user) throw notFound('Rider not found');
    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = true;
    user.refreshTokenHash = undefined;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    await user.save();
    await recordAudit(req, AuditAction.UPDATE, 'Rider', user._id, { passwordReset: true });
    res.json({ success: true, message: 'Temporary password set. The rider must change it on next sign-in.' });
  }

  // ---------- Staff (employees & admins) ----------

  static async getEmployees(req, res) {
    const staff = await User.find({ role: { $in: [UserRole.EMPLOYEE, UserRole.ADMIN] } })
      .select('name phone email role permissions isActive createdAt lastLoginAt +setupTokenExpires +passwordHash')
      .sort({ role: 1, createdAt: -1 })
      .lean();
    res.json({
      success: true,
      data: staff.map((s) => ({
        id: String(s._id),
        name: s.name,
        phone: s.phone,
        email: s.email || '',
        role: s.role,
        permissions: s.permissions || [],
        isActive: s.isActive,
        lastLoginAt: s.lastLoginAt || null,
        activationPending: !s.passwordHash,
        activationExpires: !s.passwordHash ? s.setupTokenExpires || null : null
      })),
      availablePermissions: PERMISSIONS
    });
  }

  static async createEmployee(req, res) {
    const data = employeeCreateSchema.parse(req.body);
    if (req.user.role !== UserRole.ADMIN && data.permissions.some((p) => !req.user.permissions.includes(p))) {
      throw forbidden('You cannot grant permissions you do not have');
    }
    await assertPhoneFree(data.phone);
    await assertEmailFree(data.email || undefined);

    const user = await User.create({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      role: UserRole.EMPLOYEE,
      permissions: data.permissions,
      profileComplete: true
    });
    const setupToken = await AuthService.createSetupToken(user._id);
    await recordAudit(req, AuditAction.CREATE, 'Employee', user._id, { name: user.name, permissions: data.permissions });
    res.status(201).json({
      success: true,
      data: { id: String(user._id), setupToken, activationPath: `/activate?token=${setupToken}` },
      message: 'Employee created. Share the one-time activation link with them.'
    });
  }

  static async regenerateActivation(req, res) {
    assertObjectId(req.params.id, 'employee id');
    const user = await User.findOne({ _id: req.params.id, role: UserRole.EMPLOYEE }).select('+passwordHash');
    if (!user) throw notFound('Employee not found');
    if (user.passwordHash) throw conflict('This employee has already activated their account', 'ALREADY_ACTIVE');
    // The link signs in as this employee, so handing it out is the same as granting their permissions.
    if (req.user.role !== UserRole.ADMIN && (user.permissions || []).some((p) => !req.user.permissions.includes(p))) {
      throw forbidden('This employee has permissions you do not have. Ask an admin for a new activation link.', 'PERMISSION_ESCALATION');
    }
    const setupToken = await AuthService.createSetupToken(user._id);
    await recordAudit(req, AuditAction.UPDATE, 'Employee', user._id, { activationLinkRegenerated: true });
    res.json({ success: true, data: { setupToken, activationPath: `/activate?token=${setupToken}` } });
  }

  static async createPasswordResetLink(req, res) {
    assertObjectId(req.params.id, 'user id');
    const user = await User.findById(req.params.id);
    if (!user) throw notFound('User not found');
    if (user.role === UserRole.ADMIN && String(req.user._id) !== String(user._id) && req.user.role !== 'SUPER_ADMIN') {
      throw forbidden('Only a Super Admin can issue reset links for administrators', 'ADMIN_PROTECTED');
    }
    const { token, expiresAt } = await AuthService.createPasswordResetToken(user._id);
    await recordAudit(req, AuditAction.UPDATE, 'User', user._id, { passwordResetLinkGenerated: true });
    res.json({
      success: true,
      data: { id: String(user._id), resetToken: token, resetPath: `/reset-password?token=${token}`, expiresAt },
      message: 'Password reset link generated. Share it securely with the user.'
    });
  }

  static async unlockUser(req, res) {
    assertObjectId(req.params.id, 'user id');
    const user = await User.findById(req.params.id);
    if (!user) throw notFound('User not found');
    user.failedLogins = 0;
    user.lockedUntil = null;
    await user.save();
    await recordAudit(req, AuditAction.UPDATE, 'User', user._id, { accountUnlocked: true });
    res.json({ success: true, message: 'User account unlocked successfully' });
  }

  static async updateEmployee(req, res) {
    assertObjectId(req.params.id, 'employee id');
    if (req.user.role !== UserRole.ADMIN) throw forbidden('Only an admin can modify staff accounts');
    const data = employeeUpdateSchema.parse(req.body);
    const user = await User.findOne({ _id: req.params.id, role: { $in: [UserRole.EMPLOYEE, UserRole.ADMIN] } });
    if (!user) throw notFound('Employee not found');
    if (String(user._id) === String(req.user._id) && data.isActive === false) throw forbidden('You cannot deactivate your own account');

    if (data.phone && data.phone !== user.phone) await assertPhoneFree(data.phone, user._id);
    if (data.email && data.email !== user.email) await assertEmailFree(data.email, user._id);

    if (data.name) user.name = data.name;
    if (data.phone) user.phone = data.phone;
    if (data.email !== undefined) user.email = data.email || undefined;
    if (data.permissions && user.role === UserRole.EMPLOYEE) user.permissions = data.permissions;
    if (typeof data.isActive === 'boolean') {
      user.isActive = data.isActive;
      if (!data.isActive) user.refreshTokenHash = undefined;
    }
    await user.save();
    await recordAudit(req, AuditAction.UPDATE, 'Employee', user._id, { fields: Object.keys(data) });
    res.json({ success: true, message: 'Staff account updated' });
  }

  // ---------- Settings ----------

  static async getSettings(req, res) {
    res.json({ success: true, data: await Settings.getSingleton() });
  }

  static async updateSettings(req, res) {
    const { billing, ...data } = settingsSchema.parse(req.body);
    const settings = await Settings.getSingleton();
    settings.set(data);
    // Merge billing fields one by one so a partial update keeps the others.
    Object.entries(billing || {}).forEach(([key, value]) => settings.set(`billing.${key}`, value));
    await settings.save();
    await recordAudit(req, AuditAction.UPDATE, 'Settings', settings._id, billing ? { ...data, billing } : data);
    res.json({ success: true, data: settings });
  }

  // ---------- Audit ----------

  static async getAuditLogs(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
    const filter = {};
    if (req.query.resource) filter.resource = String(req.query.resource);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate('user', 'name role').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);
    res.json({ success: true, data: logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  }
}

module.exports = { AdminController };
