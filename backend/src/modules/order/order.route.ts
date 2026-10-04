import { Router } from 'express';
import { OrderController } from './order.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/checkout', OrderController.checkout);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.get('/:id/otp', OrderController.getCustomerOtp);
router.put('/:id/status', OrderController.updateOrderStatus);
router.post('/:id/verify-otp', OrderController.verifyOtp);
router.post('/:id/deliver', OrderController.deliverOrder);
router.post('/:id/resend-otp', OrderController.resendOtp);
router.put('/:id/tracking', OrderController.updateTracking);
router.get('/:id/tracking', OrderController.getTracking);
router.put('/:id/payment-status', OrderController.updatePaymentStatus);

export default router;
