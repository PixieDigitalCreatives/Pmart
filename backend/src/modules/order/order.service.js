'use strict';

const { Order, OrderStatus, PaymentStatus, DeliveryVerification } = require('./order.model');
const { OtpService } = require('./otp.service');
const { Product } = require('../catalog/catalog.model');
const { Shop } = require('../shop/shop.model');
const { RiderProfile, RiderAvailability } = require('../rider/rider.model');
const { User, UserRole } = require('../auth/auth.model');
const { hasPermission } = require('../../middleware/auth.middleware');
const { notFound, forbidden, badRequest, conflict } = require('../../utils/http-error');
const { assertObjectId } = require('../../utils/validation');

const S = OrderStatus;

// Who may move an order between statuses through the generic status endpoint.
// ASSIGNED, PICKED_UP and DELIVERED have dedicated endpoints with extra checks.
const ACTORS = { CUSTOMER: 'CUSTOMER', SHOP: 'SHOP', RIDER: 'RIDER', STAFF: 'STAFF' };
const { CUSTOMER, SHOP, RIDER, STAFF } = ACTORS;

const TRANSITIONS = {
  [S.PENDING]: { [S.ACCEPTED]: [SHOP, STAFF], [S.REJECTED]: [SHOP, STAFF], [S.CANCELLED]: [CUSTOMER, STAFF] },
  [S.ACCEPTED]: { [S.PREPARING]: [SHOP, STAFF], [S.CANCELLED]: [CUSTOMER, SHOP, STAFF] },
  [S.PREPARING]: { [S.READY]: [SHOP, STAFF], [S.CANCELLED]: [SHOP, STAFF] },
  [S.READY]: { [S.CANCELLED]: [SHOP, STAFF] },
  [S.ASSIGNED]: { [S.CANCELLED]: [STAFF] },
  [S.PICKED_UP]: { [S.OUT_FOR_DELIVERY]: [RIDER, STAFF] },
  [S.OUT_FOR_DELIVERY]: { [S.ARRIVED]: [RIDER, STAFF], [S.DELIVERY_FAILED]: [RIDER, STAFF] },
  [S.ARRIVED]: { [S.DELIVERY_FAILED]: [RIDER, STAFF] },
  [S.DELIVERY_FAILED]: { [S.READY]: [SHOP, STAFF], [S.CANCELLED]: [STAFF] },
  [S.DELIVERED]: {},
  [S.REJECTED]: {},
  [S.CANCELLED]: {}
};

const ORDER_POPULATE = [
  { path: 'shop', select: 'name phone address location openTime closeTime' },
  { path: 'customer', select: 'name phone email' },
  { path: 'rider', select: 'name phone' }
];

/** Resolves how the user relates to the order, or throws 403/404. */
async function resolveActor(user, order, { session } = {}) {
  if (hasPermission(user, 'orders.manage')) return STAFF;
  if (user.role === UserRole.CUSTOMER && String(order.customer) === String(user._id)) return CUSTOMER;
  if (user.role === UserRole.RIDER && order.rider && String(order.rider) === String(user._id)) return RIDER;
  if (user.role === UserRole.SHOP_OWNER) {
    const owns = await Shop.exists({ _id: order.shop, owner: user._id }).session(session || null);
    if (owns) return SHOP;
  }
  throw forbidden('You do not have access to this order');
}

/** Read access additionally covers EMPLOYEEs holding orders.read. */
async function assertCanView(user, order) {
  if (hasPermission(user, 'orders.read')) return;
  await resolveActor(user, order);
}

async function loadOrder(id, { session, select } = {}) {
  assertObjectId(id, 'order id');
  const query = Order.findById(id).session(session || null);
  if (select) query.select(select);
  const order = await query;
  if (!order) throw notFound('Order not found');
  return order;
}

function pushHistory(order, status, user, note) {
  order.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: user ? user._id : undefined,
    actorRole: user ? user.role : 'SYSTEM',
    note
  });
}

async function releaseRider(order, session, { completed = false } = {}) {
  if (!order.rider) return;
  const update = { $set: { availabilityStatus: RiderAvailability.AVAILABLE, currentOrder: null } };
  if (completed) update.$inc = { completedDeliveries: 1 };
  await RiderProfile.updateOne({ user: order.rider, currentOrder: order._id }, update, { session });
}

async function restoreInventory(order, session) {
  if (order.inventoryRestored) return;
  for (const item of order.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stockCount: item.quantity } }, { session });
  }
  order.inventoryRestored = true;
}

/**
 * Applies a status change requested through the generic status endpoint, including all side effects.
 * Must be called inside a transaction; the caller saves nothing else on the order.
 */
async function applyStatusChange({ order, to, user, actor, reason, session }) {
  const from = order.status;
  const allowedActors = (TRANSITIONS[from] || {})[to];
  if (!allowedActors) {
    throw badRequest(`Cannot move an order from ${from.replace(/_/g, ' ')} to ${String(to).replace(/_/g, ' ')}`, 'INVALID_TRANSITION');
  }
  if (!allowedActors.includes(actor)) {
    throw forbidden(`You are not allowed to change this order to ${to.replace(/_/g, ' ')}`, 'TRANSITION_NOT_ALLOWED');
  }

  const now = new Date();
  switch (to) {
    case S.ACCEPTED:
      order.acceptedAt = now;
      break;
    case S.READY:
      order.readyAt = now;
      if (from === S.DELIVERY_FAILED) {
        // Re-dispatch: the previous rider was released when the attempt failed.
        order.rider = null;
        order.assignedAt = undefined;
        order.deliveryVerificationStatus = DeliveryVerification.PENDING;
        order.deliveryOtpAttempts = 0;
        OtpService.clearOtp(order);
      }
      break;
    case S.OUT_FOR_DELIVERY:
      order.outForDeliveryAt = now;
      if (!order.deliveryOtpHash || OtpService.isExpired(order)) await OtpService.assignNewOtp(order);
      break;
    case S.ARRIVED:
      order.arrivedAt = now;
      break;
    case S.DELIVERY_FAILED:
      if (!reason) throw badRequest('Please give a reason for the failed delivery', 'REASON_REQUIRED');
      await releaseRider(order, session);
      OtpService.clearOtp(order);
      break;
    case S.CANCELLED:
    case S.REJECTED:
      if (to === S.REJECTED && !reason) throw badRequest('Please give a reason for rejecting the order', 'REASON_REQUIRED');
      order.cancelledAt = now;
      order.cancellationReason = reason || (actor === CUSTOMER ? 'Cancelled by customer' : 'Cancelled');
      await releaseRider(order, session);
      await restoreInventory(order, session);
      OtpService.clearOtp(order);
      break;
    default:
      break;
  }

  order.status = to;
  pushHistory(order, to, user, reason);
  await order.save({ session });
  return order;
}

/** Assigns (or re-assigns) a rider to a READY/ASSIGNED order. */
async function assignRider({ order, riderUserId, user, session }) {
  if (![S.READY, S.ASSIGNED].includes(order.status)) {
    throw conflict('A rider can only be assigned when the order is READY or already ASSIGNED', 'INVALID_TRANSITION');
  }
  assertObjectId(riderUserId, 'rider id');
  if (order.rider && String(order.rider) === String(riderUserId)) return order;

  const riderUser = await User.findOne({ _id: riderUserId, role: UserRole.RIDER, isActive: true }).session(session);
  if (!riderUser) throw notFound('Rider not found or inactive');

  const claimed = await RiderProfile.findOneAndUpdate(
    { user: riderUserId, availabilityStatus: RiderAvailability.AVAILABLE, currentOrder: null },
    { $set: { availabilityStatus: RiderAvailability.BUSY, currentOrder: order._id } },
    { session, new: true }
  );
  if (!claimed) throw conflict('This rider is not available right now', 'RIDER_UNAVAILABLE');

  if (order.rider) await releaseRider(order, session);

  const reassigned = order.status === S.ASSIGNED;
  order.rider = riderUser._id;
  order.assignedAt = new Date();
  order.status = S.ASSIGNED;
  pushHistory(order, S.ASSIGNED, user, `${reassigned ? 'Re-assigned' : 'Assigned'} to ${riderUser.name || 'rider'}`);
  await order.save({ session });
  return order;
}

async function markPickedUp({ order, user, session }) {
  if (order.status !== S.ASSIGNED) {
    throw conflict(`Order cannot be picked up while ${order.status.replace(/_/g, ' ')}`, 'INVALID_TRANSITION');
  }
  order.status = S.PICKED_UP;
  order.pickedUpAt = new Date();
  pushHistory(order, S.PICKED_UP, user);
  await order.save({ session });
  return order;
}

async function markDelivered({ order, user, session }) {
  if (order.status !== S.ARRIVED) {
    throw conflict('Mark the order as ARRIVED at the customer before completing delivery', 'INVALID_TRANSITION');
  }
  if (order.deliveryVerificationStatus !== DeliveryVerification.OTP_VERIFIED) {
    throw conflict("Verify the customer's delivery OTP before completing delivery", 'OTP_NOT_VERIFIED');
  }
  if (order.paymentMethod === 'COD' && order.paymentStatus !== PaymentStatus.COLLECTED) {
    throw conflict('Collect the cash payment before completing delivery', 'PAYMENT_NOT_COLLECTED');
  }
  order.status = S.DELIVERED;
  order.deliveredAt = new Date();
  OtpService.clearOtp(order);
  await releaseRider(order, session, { completed: true });
  pushHistory(order, S.DELIVERED, user);
  await order.save({ session });
  return order;
}

async function populateOrder(orderOrId) {
  const order = typeof orderOrId === 'object' && orderOrId.populate ? orderOrId : await Order.findById(orderOrId);
  if (!order) return null;
  await order.populate(ORDER_POPULATE);
  const json = order.toJSON();
  if (order.rider) {
    const profile = await RiderProfile.findOne({ user: order.rider._id || order.rider }).select('vehicleType vehicleNumber').lean();
    if (profile && json.rider) Object.assign(json.rider, { vehicleType: profile.vehicleType, vehicleNumber: profile.vehicleNumber });
  }
  delete json.encryptedOtp;
  delete json.deliveryOtpHash;
  return json;
}

module.exports = {
  ACTORS,
  TRANSITIONS,
  ORDER_POPULATE,
  resolveActor,
  assertCanView,
  loadOrder,
  applyStatusChange,
  assignRider,
  markPickedUp,
  markDelivered,
  populateOrder,
  pushHistory
};
