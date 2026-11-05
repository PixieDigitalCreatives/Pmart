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
const { perfLogger } = require('./middleware/perf-logger');
const { memoryCache } = require('./utils/cache');

const app = express();

app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');
app.use(perfLogger);
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
// CSV imports carry the whole file (up to 8 MB of text) in the JSON body.
app.use('/api/inventory/imports', express.json({ limit: '12mb' }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(require('./middleware/csrf.middleware').csrfProtection);

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', database: connected ? 'connected' : 'disconnected', timestamp: new Date().toISOString() });
});

app.get('/api/settings/public', async (req, res) => {
  const cacheKey = 'settings:public';
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.json({ success: true, data: cached });
  }

  const s = await Settings.getSingleton();
  const data = {
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    baseDeliveryFee: s.baseDeliveryFee,
    platformHandlingFee: s.platformHandlingFee,
    supportPhone: s.supportPhone,
    supportEmail: s.supportEmail,
    otpLength: env.OTP_LENGTH,
    googleSignIn: isGoogleSignInEnabled()
  };
  memoryCache.set(cacheKey, data, 120);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  res.json({ success: true, data });
});

// Middleware to prevent caching on private and transactional routes
const noStore = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

app.use('/api/auth', noStore, require('./modules/auth/auth.route'));
app.use('/api/users', noStore, require('./modules/users/user.route'));
app.use('/api/shops', require('./modules/shop/shop.route'));
app.use('/api/cart', noStore, require('./modules/cart/cart.route'));
app.use('/api/orders', noStore, require('./modules/order/order.route'));
app.use('/api/admin', noStore, require('./modules/admin/admin.route'));
app.use('/api/rider', noStore, require('./modules/rider/rider.route'));
app.use('/api/addresses', noStore, require('./modules/address/address.route'));
app.use('/api/routing', require('./modules/routing/routing.route'));
app.use('/api/inventory', noStore, require('./modules/inventory/inventory.route'));
app.use('/api/billing', noStore, require('./modules/billing/billing.route'));
app.use('/api/reports', noStore, require('./modules/reports/report.route'));
app.get('/api/product-images/:id', require('./modules/inventory/inventory.controller').servePublicImage);
app.use('/api', require('./modules/catalog/catalog.route'));

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
