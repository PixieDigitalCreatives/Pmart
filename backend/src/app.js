'use strict';

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const { limiter } = require('./middleware/rate-limit');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { Settings } = require('./modules/admin/settings.model');
const { HttpError } = require('./utils/http-error');
const { isGoogleSignInEnabled } = require('./config/firebase-admin');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.headers['x-request-id'] = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.headers['x-request-id']);
  next();
});
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header (server-to-server, curl) are allowed; browsers always send one.
      if (!origin || env.isAllowedOrigin(origin)) return callback(null, true);
      return callback(new HttpError(403, 'This origin is not allowed to call the PMart API', 'CORS_FORBIDDEN'));
    },
    credentials: true
  })
);
app.use(limiter({ windowMs: 15 * 60 * 1000, max: 600, message: 'Too many requests. Please try again later.' }));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
});

app.get('/api/settings/public', async (req, res) => {
  const s = await Settings.getSingleton();
  res.json({
    success: true,
    data: {
      freeDeliveryThreshold: s.freeDeliveryThreshold,
      baseDeliveryFee: s.baseDeliveryFee,
      platformHandlingFee: s.platformHandlingFee,
      supportPhone: s.supportPhone,
      supportEmail: s.supportEmail,
      otpLength: env.OTP_LENGTH,
      googleSignIn: isGoogleSignInEnabled()
    }
  });
});

app.use('/api/auth', require('./modules/auth/auth.route'));
app.use('/api/users', require('./modules/users/user.route'));
app.use('/api/shops', require('./modules/shop/shop.route'));
app.use('/api/cart', require('./modules/cart/cart.route'));
app.use('/api/orders', require('./modules/order/order.route'));
app.use('/api/admin', require('./modules/admin/admin.route'));
app.use('/api/rider', require('./modules/rider/rider.route'));
app.use('/api/addresses', require('./modules/address/address.route'));
app.use('/api/routing', require('./modules/routing/routing.route'));
app.use('/api', require('./modules/catalog/catalog.route'));

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
