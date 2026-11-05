'use strict';

const crypto = require('crypto');
const { Order, OrderStatus, PaymentStatus, PaymentMethod, DeliveryVerification } = require('./order.model');
const { Address } = require('../address/address.model');
const mongoose = require('mongoose');
const { Product } = require('../catalog/catalog.model');
const { Shop } = require('../shop/shop.model');
const { applyStockChange } = require('../inventory/inventory.service');
const { MovementType, RefType } = require('../inventory/inventory.model');
const { Cart } = require('../cart/cart.model');
const { Settings } = require('../admin/settings.model');
const { UserRole } = require('../auth/auth.model');
const { hasPermission } = require('../../middleware/auth.middleware');
const { OtpService, MAX_OTP_ATTEMPTS } = require('./otp.service');
const OrderService = require('./order.service');
const { emitOrderUpdate } = require('../../config/socket');
const { recordAudit, AuditAction } = require('../admin/audit.model');
const { runInTransaction } = require('../../utils/transaction');
const { distanceKm } = require('../../utils/geo');
const { escapeRegExp } = require('../../utils/regex');
const { z, objectId, parsePagination, parseSearch } = require('../../utils/validation');
const { badRequest, conflict, forbidden } = require('../../utils/http-error');
const { env } = require('../../config/env');

const { ACTORS } = OrderService;

const checkoutSchema = z.object({
  addressId: objectId,
  items: z
    .array(z.object({ product: objectId, quantity: z.number().int().min(1).max(99) }))
    .min(1, 'Your cart is empty')
    .max(50, 'Too many different items in one order'),
  deliveryInstructions: z.string().trim().max(300).optional().or(z.literal('')),
  paymentMethod: z.enum(Object.values(PaymentMethod)).default(PaymentMethod.COD),
  idempotencyKey: z.string().trim().min(8).max(100).optional()
});

const statusSchema = z.object({
  status: z.enum(Object.values(OrderStatus)),
  reason: z.string().trim().max(300).optional()
});

const round2 = (n) => Math.round(n * 100) / 100;

function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `PM${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function sameItems(order, items) {
  const a = new Map(order.items.map((i) => [String(i.product), i.quantity]));
  const b = new Map();
  items.forEach((i) => b.set(i.product, (b.get(i.product) || 0) + i.quantity));
  if (a.size !== b.size) return false;
  for (const [id, qty] of a) if (b.get(id) !== qty) return false;
  return true;
}

/** Builds the role-scoped base filter for listing orders. */
async function scopeFilter(user) {
  if (hasPermission(user, 'orders.read')) return {};
  switch (user.role) {
    case UserRole.CUSTOMER:
      return { customer: user._id };
    case UserRole.RIDER:
      return { rider: user._id };
    case UserRole.SHOP_OWNER:
      return { shop: { $in: await Shop.distinct('_id', { owner: user._id }) } };
    default:
      throw forbidden('You do not have access to orders');
  }
}

async function respondWithOrder(res, order, extra = {}) {
  emitOrderUpdate(order);
  res.json({ success: true, data: await OrderService.populateOrder(order), ...extra });
}

class OrderController {
  // ---------- Checkout ----------

  static async checkout(req, res) {
    const input = checkoutSchema.parse(req.body);
    const customerId = req.user._id;

    const execute = () =>
      runInTransaction(async (session) => {
        if (input.idempotencyKey) {
          const existing = await Order.findOne({ customer: customerId, idempotencyKey: input.idempotencyKey }).session(session);
          if (existing) {
            if (!sameItems(existing, input.items)) throw conflict('This checkout was already submitted with different items', 'IDEMPOTENCY_MISMATCH');
            return { order: existing, replayed: true };
          }
        }

        const address = await Address.findOne({ _id: input.addressId, user: customerId, isActive: true }).session(session);
        if (!address) throw badRequest('Please choose a saved delivery address', 'INVALID_ADDRESS');

        // Merge duplicate lines and lock rows in a stable order to avoid deadlock-like write conflicts.
        const quantities = new Map();
        input.items.forEach((i) => quantities.set(i.product, (quantities.get(i.product) || 0) + i.quantity));
        const productIds = [...quantities.keys()].sort();

        const products = await Product.find({ _id: { $in: productIds } }).session(session);
        const byId = new Map(products.map((p) => [String(p._id), p]));
        const unavailable = productIds.filter((id) => !byId.get(id) || !byId.get(id).isActive);
        if (unavailable.length) {
          throw conflict('Some items in your cart are no longer available', 'PRODUCT_NOT_FOUND', { productIds: unavailable });
        }

        const shopIds = new Set(products.map((p) => String(p.shop)));
        if (shopIds.size !== 1) throw badRequest('All items in an order must come from the same store', 'MULTIPLE_SHOPS');
        const shop = await Shop.findById([...shopIds][0]).session(session);
        if (!shop || !shop.isActive) throw conflict('This store is currently unavailable', 'SHOP_UNAVAILABLE');
        if (!shop.isAcceptingOrders) throw conflict(`${shop.name} is not accepting orders right now`, 'SHOP_NOT_ACCEPTING');

        const [lng, lat] = address.location.coordinates;
        const distance = distanceKm({ lat, lng }, shop.location);
        if (distance > shop.deliveryRadiusKm) {
          throw badRequest(`This address is ${distance.toFixed(1)} km away, outside ${shop.name}'s ${shop.deliveryRadiusKm} km delivery area`, 'OUT_OF_DELIVERY_AREA');
        }

        const orderItems = [];
        let subTotal = 0;
        // The order id is fixed up front so each stock-ledger row can point at it.
        const orderId = new mongoose.Types.ObjectId();
        const orderNumber = newOrderNumber();
        for (const id of productIds) {
          const quantity = quantities.get(id);
          const moved = await applyStockChange(session, {
            productId: id,
            delta: -quantity,
            filter: { isActive: true },
            type: MovementType.ONLINE_ORDER,
            refType: RefType.ORDER,
            refId: orderId,
            refNumber: orderNumber,
            user: { _id: customerId },
            dedupeKey: `ORD:${orderId}:${id}:SALE`
          });
          const updated = moved && moved.product;
          if (!updated) {
            const product = byId.get(id);
            throw conflict(
              product.stockCount > 0 ? `Only ${product.stockCount} left of ${product.name}` : `${product.name} is out of stock`,
              'INSUFFICIENT_STOCK',
              { productId: id, available: product.stockCount }
            );
          }
          subTotal += updated.price * quantity;
          orderItems.push({
            product: updated._id,
            name: updated.name,
            unit: updated.unit,
            imageUrl: updated.imageUrl,
            price: updated.price,
            mrp: updated.mrp,
            quantity
          });
        }

        const settings = await Settings.getSingleton(session);
        subTotal = round2(subTotal);
        const deliveryFee = subTotal >= settings.freeDeliveryThreshold ? 0 : settings.baseDeliveryFee;
        const platformFee = settings.platformHandlingFee;

        const [order] = await Order.create(
          [
            {
              _id: orderId,
              orderNumber,
              customer: customerId,
              shop: shop._id,
              items: orderItems,
              subTotal,
              deliveryFee,
              platformFee,
              totalAmount: round2(subTotal + deliveryFee + platformFee),
              deliveryAddress: {
                recipientName: address.recipientName,
                recipientPhone: address.recipientPhone,
                label: address.label,
                houseNumber: address.houseNumber,
                buildingName: address.buildingName,
                floor: address.floor,
                street: address.street,
                area: address.area,
                landmark: address.landmark,
                city: address.city,
                district: address.district,
                state: address.state,
                pincode: address.pincode,
                country: address.country,
                formattedAddress: address.formattedAddress,
                location: { type: 'Point', coordinates: [lng, lat] }
              },
              deliveryInstructions: input.deliveryInstructions || address.deliveryInstructions || undefined,
              paymentMethod: input.paymentMethod,
              idempotencyKey: input.idempotencyKey,
              statusHistory: [{ status: OrderStatus.PENDING, changedAt: new Date(), changedBy: customerId, actorRole: 'CUSTOMER', note: 'Order placed' }]
            }
          ],
          { session }
        );

        await Cart.updateOne({ user: customerId }, { $set: { items: [] } }, { session });
        return { order, replayed: false };
      });

    let result;
    try {
      result = await execute();
    } catch (err) {
      // Two identical submissions raced: the loser returns the winner's order.
      if (err.code === 11000 && err.keyPattern && err.keyPattern.idempotencyKey && input.idempotencyKey) {
        const existing = await Order.findOne({ customer: customerId, idempotencyKey: input.idempotencyKey });
        if (existing) result = { order: existing, replayed: true };
      }
      if (!result) throw err;
    }

    if (!result.replayed) emitOrderUpdate(result.order);
    res.status(result.replayed ? 200 : 201).json({
      success: true,
      data: await OrderService.populateOrder(result.order),
      message: result.replayed ? 'Order already placed' : 'Order placed'
    });
  }

  // ---------- Reading ----------

  static async getOrders(req, res) {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const filter = await scopeFilter(req.user);

    if (req.query.status && req.query.status !== 'all') {
      const statuses = String(req.query.status).split(',').filter((s) => Object.values(OrderStatus).includes(s));
      if (statuses.length) filter.status = { $in: statuses };
    }
    if (req.query.paymentStatus && Object.values(PaymentStatus).includes(req.query.paymentStatus)) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    const search = parseSearch(req.query.search);
    if (search) filter.orderNumber = { $regex: escapeRegExp(search), $options: 'i' };

    const [orders, total] = await Promise.all([
      Order.find(filter).populate(OrderService.ORDER_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);
    res.json({ success: true, data: orders, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  }

  static async getOrderById(req, res) {
    const order = await OrderService.loadOrder(req.params.id);
    await OrderService.assertCanView(req.user, order);
    res.json({ success: true, data: await OrderService.populateOrder(order) });
  }

  static async getTracking(req, res) {
    const order = await OrderService.loadOrder(req.params.id);
    await OrderService.assertCanView(req.user, order);
    const populated = await OrderService.populateOrder(order);
    res.json({
      success: true,
      data: {
        orderId: populated._id,
        orderNumber: populated.orderNumber,
        status: populated.status,
        rider: populated.rider,
        shop: populated.shop,
        hubLocation: populated.shop ? populated.shop.location : null,
        customerLocation: populated.deliveryAddress,
        tracking: populated.tracking
      }
    });
  }

  /** Lets the customer read their own delivery OTP once the order is out for delivery. */
  static async getCustomerOtp(req, res) {
    const order = await OrderService.loadOrder(req.params.id, { select: '+encryptedOtp' });
    if (req.user.role !== UserRole.CUSTOMER || String(order.customer) !== String(req.user._id)) throw forbidden();
    if (![OrderStatus.OUT_FOR_DELIVERY, OrderStatus.ARRIVED].includes(order.status)) {
      throw badRequest('The delivery code is shown once your order is out for delivery', 'OTP_NOT_READY');
    }
    if (order.deliveryVerificationStatus === DeliveryVerification.OTP_VERIFIED) {
      return res.json({ success: true, data: { deliveryOtp: null, verified: true } });
    }
    res.json({ success: true, data: { deliveryOtp: OtpService.reveal(order), verified: false, expiresAt: order.deliveryOtpExpiry } });
  }

  // ---------- Status changes ----------

  static async updateOrderStatus(req, res) {
    const { status, reason } = statusSchema.parse(req.body);
    if ([OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.DELIVERED].includes(status)) {
      throw badRequest(`Use the dedicated action to mark an order ${status.replace(/_/g, ' ')}`, 'USE_DEDICATED_ENDPOINT');
    }
    const order = await runInTransaction(async (session) => {
      const doc = await OrderService.loadOrder(req.params.id, { session, select: '+encryptedOtp +deliveryOtpHash' });
      const actor = await OrderService.resolveActor(req.user, doc, { session });
      return OrderService.applyStatusChange({ order: doc, to: status, user: req.user, actor, reason, session });
    });
    await respondWithOrder(res, order);
  }

  static async assignRider(req, res) {
    const { riderId } = z.object({ riderId: objectId }).parse(req.body);
    const order = await runInTransaction(async (session) => {
      const doc = await OrderService.loadOrder(req.params.id, { session });
      const actor = await OrderService.resolveActor(req.user, doc, { session });
      if (![ACTORS.STAFF, ACTORS.SHOP].includes(actor)) throw forbidden('Only store or operations staff can assign riders');
      return OrderService.assignRider({ order: doc, riderUserId: riderId, user: req.user, session });
    });
    await respondWithOrder(res, order);
  }

  // ---------- Delivery handover ----------

  static async verifyOtp(req, res) {
    const { otp } = z.object({ otp: z.string().trim().regex(new RegExp(`^\\d{${env.OTP_LENGTH}}$`), `Enter the ${env.OTP_LENGTH}-digit code`) }).parse({
      otp: String(req.body.otp ?? '')
    });

    const outcome = await runInTransaction(async (session) => {
      const order = await OrderService.loadOrder(req.params.id, { session, select: '+deliveryOtpHash' });
      const actor = await OrderService.resolveActor(req.user, order, { session });
      if (![ACTORS.RIDER, ACTORS.STAFF].includes(actor)) throw forbidden('Only the assigned rider can verify the delivery code');
      if (![OrderStatus.OUT_FOR_DELIVERY, OrderStatus.ARRIVED].includes(order.status)) {
        throw badRequest('The order is not out for delivery', 'INVALID_STATE');
      }
      if (order.deliveryVerificationStatus === DeliveryVerification.OTP_VERIFIED) return { order, valid: true };
      if (order.deliveryOtpAttempts >= MAX_OTP_ATTEMPTS) {
        throw conflict('Too many wrong attempts. Generate a new code for the customer.', 'OTP_LOCKED');
      }
      if (!order.deliveryOtpHash || OtpService.isExpired(order)) {
        throw conflict('The delivery code has expired. Generate a new code for the customer.', 'OTP_EXPIRED');
      }

      const valid = await OtpService.matches(order, otp);
      if (valid) {
        order.deliveryVerificationStatus = DeliveryVerification.OTP_VERIFIED;
        OrderService.pushHistory(order, order.status, req.user, 'Delivery code verified');
      } else {
        order.deliveryOtpAttempts += 1;
      }
      await order.save({ session });
      return { order, valid };
    });

    if (!outcome.valid) {
      const left = MAX_OTP_ATTEMPTS - outcome.order.deliveryOtpAttempts;
      throw badRequest(left > 0 ? `Incorrect code. ${left} attempt(s) left.` : 'Incorrect code. The code is now locked.', 'OTP_INVALID');
    }
    await respondWithOrder(res, outcome.order, { message: 'Delivery code verified' });
  }

  static async resendOtp(req, res) {
    const order = await runInTransaction(async (session) => {
      const doc = await OrderService.loadOrder(req.params.id, { session, select: '+encryptedOtp +deliveryOtpHash' });
      const actor = await OrderService.resolveActor(req.user, doc, { session });
      if (![ACTORS.RIDER, ACTORS.STAFF].includes(actor)) throw forbidden();
      if (![OrderStatus.OUT_FOR_DELIVERY, OrderStatus.ARRIVED].includes(doc.status)) throw badRequest('The order is not out for delivery', 'INVALID_STATE');
      if (doc.deliveryVerificationStatus === DeliveryVerification.OTP_VERIFIED) throw conflict('The delivery code is already verified', 'OTP_ALREADY_VERIFIED');
      await OtpService.assignNewOtp(doc);
      await doc.save({ session });
      return doc;
    });
    await respondWithOrder(res, order, { message: 'A new delivery code is now visible in the customer app' });
  }

  static async updatePaymentStatus(req, res) {
    const { paymentStatus, reason } = z
      .object({ paymentStatus: z.enum(Object.values(PaymentStatus)), reason: z.string().trim().max(300).optional() })
      .parse(req.body);
    let change = null;
    const order = await runInTransaction(async (session) => {
      change = null;
      const doc = await OrderService.loadOrder(req.params.id, { session });
      const actor = await OrderService.resolveActor(req.user, doc, { session });
      if (actor === ACTORS.RIDER) {
        if (paymentStatus !== PaymentStatus.COLLECTED) throw forbidden('Riders can only mark cash as collected');
        if (doc.status !== OrderStatus.ARRIVED) throw conflict('Mark the order as ARRIVED before collecting cash', 'INVALID_STATE');
      } else if (actor !== ACTORS.STAFF) {
        throw forbidden('Only the assigned rider or operations staff can update payment');
      }
      if (doc.paymentStatus === paymentStatus) return doc;
      // Staff corrections are overrides of the cash record: they need a reason and are audited.
      if (actor === ACTORS.STAFF && (!reason || reason.length < 3)) {
        throw badRequest('Give a reason for changing the payment status', 'REASON_REQUIRED');
      }
      if (paymentStatus === PaymentStatus.REFUNDED && doc.paymentStatus !== PaymentStatus.COLLECTED) {
        throw conflict('Only collected cash can be marked refunded', 'INVALID_PAYMENT_TRANSITION');
      }
      change = { from: doc.paymentStatus, to: paymentStatus, actor };
      doc.paymentStatus = paymentStatus;
      if (paymentStatus === PaymentStatus.COLLECTED) {
        doc.paymentCollectedAt = new Date();
        doc.paymentCollectedBy = req.user._id;
      }
      OrderService.pushHistory(doc, doc.status, req.user, reason ? `Payment marked ${paymentStatus}: ${reason}` : `Payment marked ${paymentStatus}`);
      await doc.save({ session });
      return doc;
    });
    if (change && change.actor === ACTORS.STAFF) {
      await recordAudit(req, AuditAction.UPDATE, 'OrderPayment', order._id, {
        orderNumber: order.orderNumber,
        before: { paymentStatus: change.from },
        after: { paymentStatus: change.to },
        reason
      });
    }
    await respondWithOrder(res, order);
  }

  static async deliverOrder(req, res) {
    const order = await runInTransaction(async (session) => {
      const doc = await OrderService.loadOrder(req.params.id, { session, select: '+encryptedOtp +deliveryOtpHash' });
      const actor = await OrderService.resolveActor(req.user, doc, { session });
      if (![ACTORS.RIDER, ACTORS.STAFF].includes(actor)) throw forbidden('Only the assigned rider can complete delivery');
      return OrderService.markDelivered({ order: doc, user: req.user, session });
    });
    await respondWithOrder(res, order, { message: 'Delivery completed' });
  }
}

/** Streams orders as CSV for accounting exports (staff with orders.read). */
async function exportOrdersCsv(req, res) {
  if (!hasPermission(req.user, 'orders.read')) throw forbidden();
  const filter = {};
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if (from && !Number.isNaN(from.getTime())) filter.createdAt = { ...filter.createdAt, $gte: from };
  if (to && !Number.isNaN(to.getTime())) filter.createdAt = { ...filter.createdAt, $lte: to };
  if (req.query.status && req.query.status !== 'all' && Object.values(OrderStatus).includes(req.query.status)) filter.status = req.query.status;

  const orders = await Order.find(filter)
    .populate([{ path: 'customer', select: 'name phone' }, { path: 'shop', select: 'name' }, { path: 'rider', select: 'name' }])
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  const esc = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s;
  };
  const header = ['Order Number', 'Placed At', 'Status', 'Store', 'Customer', 'Customer Phone', 'Rider', 'Items', 'Subtotal', 'Delivery Fee', 'Platform Fee', 'Total', 'Payment Method', 'Payment Status', 'Delivered At', 'Pincode'];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.createdAt && o.createdAt.toISOString(),
    o.status,
    o.shop && o.shop.name,
    o.customer && o.customer.name,
    o.customer && o.customer.phone,
    o.rider && o.rider.name,
    o.items.reduce((n, i) => n + i.quantity, 0),
    o.subTotal,
    o.deliveryFee,
    o.platformFee,
    o.totalAmount,
    o.paymentMethod,
    o.paymentStatus,
    o.deliveredAt && o.deliveredAt.toISOString(),
    o.deliveryAddress && o.deliveryAddress.pincode
  ]);
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pmart-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${csv}`);
}

module.exports = { OrderController, exportOrdersCsv };
