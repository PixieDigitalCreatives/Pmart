'use strict';

const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { env } = require('./env');
const { logger } = require('../utils/logger');
const { verifyAccessToken } = require('../utils/jwt');

let io = null;

const rooms = {
  admin: 'admin_deliveries',
  order: (id) => `order_${id}`,
  rider: (id) => `rider_${id}`,
  shop: (id) => `shop_${id}`
};

function canViewAllOrders(user) {
  return user.role === 'ADMIN' || (user.role === 'EMPLOYEE' && user.permissions.includes('orders.read'));
}

function initSocket(server) {
  // Required lazily to avoid a circular import with the models.
  const { User } = require('../modules/auth/auth.model');
  const { Order } = require('../modules/order/order.model');
  const { Shop } = require('../modules/shop/shop.model');

  io = new Server(server, {
    cors: { origin: (origin, cb) => cb(null, !origin || env.isAllowedOrigin(origin)), methods: ['GET', 'POST'], credentials: true }
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: Token missing'));
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('role permissions isActive tokenVersion').lean();
      if (!user || !user.isActive) return next(new Error('Authentication error: User invalid or inactive'));
      if (decoded.ver !== undefined && user.tokenVersion !== undefined && decoded.ver !== user.tokenVersion) {
        return next(new Error('Authentication error: Token revoked'));
      }
      socket.user = { _id: String(user._id), role: user.role, permissions: user.permissions || [] };
      next();
    } catch {
      next(new Error('Authentication error: Token invalid'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;

    // Personal rooms are joined automatically.
    if (user.role === 'RIDER') socket.join(rooms.rider(user._id));
    if (user.role === 'SHOP_OWNER') {
      const shops = await Shop.find({ owner: user._id }).select('_id').lean();
      shops.forEach((s) => socket.join(rooms.shop(String(s._id))));
    }

    socket.on('join_order', async (orderId) => {
      if (typeof orderId !== 'string' || !mongoose.isValidObjectId(orderId)) {
        socket.emit('error', { message: 'Invalid order ID' });
        return;
      }
      try {
        const order = await Order.findById(orderId).select('customer rider shop').lean();
        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        let allowed = canViewAllOrders(user);
        if (!allowed && user.role === 'CUSTOMER') allowed = String(order.customer) === user._id;
        if (!allowed && user.role === 'RIDER') allowed = order.rider ? String(order.rider) === user._id : false;
        if (!allowed && user.role === 'SHOP_OWNER') {
          allowed = Boolean(await Shop.exists({ _id: order.shop, owner: user._id }));
        }

        if (allowed) {
          socket.join(rooms.order(orderId));
        } else {
          socket.emit('error', { message: 'Unauthorized' });
        }
      } catch (err) {
        logger.error(`join_order failed: ${err.message}`);
        socket.emit('error', { message: 'Unable to join order' });
      }
    });

    socket.on('join_admin', () => {
      if (canViewAllOrders(user)) {
        socket.join(rooms.admin);
      } else {
        socket.emit('error', { message: 'Unauthorized' });
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

/** Broadcasts an order status change to everyone allowed to see it. Never throws. */
function emitOrderUpdate(order) {
  if (!io) return;
  const payload = {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryVerificationStatus: order.deliveryVerificationStatus,
    updatedAt: order.updatedAt || new Date()
  };
  try {
    const shopId = order.shop && (order.shop._id || order.shop);
    const riderId = order.rider && (order.rider._id || order.rider);
    let target = io.to(rooms.admin).to(rooms.order(payload.orderId));
    if (shopId) target = target.to(rooms.shop(String(shopId)));
    if (riderId) target = target.to(rooms.rider(String(riderId)));
    target.emit('order_status_update', payload);
  } catch (err) {
    logger.error(`Socket emit failed: ${err.message}`);
  }
}

function emitRiderLocation(orderId, payload) {
  if (!io) return;
  try {
    io.to(rooms.admin).to(rooms.order(String(orderId))).emit('rider:location:update', payload);
  } catch (err) {
    logger.error(`Socket emit failed: ${err.message}`);
  }
}

module.exports = { initSocket, getIO, emitOrderUpdate, emitRiderLocation, rooms };
