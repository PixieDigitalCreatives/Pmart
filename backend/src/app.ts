import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { errorHandler } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors({
  origin: true, // Allow any origin to avoid CORS issues in dev, especially with IPs/127.0.0.1
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});
app.use(limiter);

app.use(express.json());

import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.route';
import catalogRoutes from './modules/catalog/catalog.route';
import userRoutes from './modules/users/user.route';
import shopRoutes from './modules/shop/shop.route';
import cartRoutes from './modules/cart/cart.route';
import orderRoutes from './modules/order/order.route';
import adminRoutes from './modules/admin/admin.route';
import riderRoutes from './modules/rider/rider.route';
import addressRoutes from './modules/address/address.route';

app.use(cookieParser());

app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api', catalogRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
});

app.get('/api/settings/public', async (req, res, next) => {
  try {
    const { Settings } = await import('./modules/admin/settings.model');
    const settings = await Settings.findOne() || new Settings();
    res.json({
      success: true,
      data: {
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        baseDeliveryFee: settings.baseDeliveryFee,
        platformHandlingFee: settings.platformHandlingFee
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

export default app;
