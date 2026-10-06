import { Router } from 'express';
import { OrderController } from './order.controller';
import { protect } from '../../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 checkouts per 15 minutes
  message: { success: false, message: 'Too many checkout attempts, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP attempts per 15 minutes
  message: { success: false, message: 'Too many failed OTP attempts, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const router = Router();

router.use(protect);

router.post('/checkout', checkoutLimiter, OrderController.checkout);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.get('/:id/otp', OrderController.getCustomerOtp);
router.put('/:id/status', OrderController.updateOrderStatus);
router.post('/:id/verify-otp', otpLimiter, OrderController.verifyOtp);
router.post('/:id/deliver', OrderController.deliverOrder);
router.post('/:id/resend-otp', OrderController.resendOtp);
router.put('/:id/tracking', OrderController.updateTracking);
router.get('/:id/tracking', OrderController.getTracking);
router.put('/:id/payment-status', OrderController.updatePaymentStatus);

export default router;
