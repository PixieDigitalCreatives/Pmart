import { Router } from 'express';
import { RiderController } from './rider.controller';
import { protect, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../auth/auth.model';
import rateLimit from 'express-rate-limit';

const locationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 location updates per minute (one every 2 seconds max)
  message: { success: false, message: 'Too many location updates' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const router = Router();

router.use(protect);
router.use(authorize(UserRole.RIDER));

router.post('/orders/:id/pickup', RiderController.pickupOrder);
router.post('/location', locationLimiter, RiderController.updateLocation);
router.get('/profile', RiderController.getProfile);
router.put('/profile', RiderController.updateProfile);

export default router;
