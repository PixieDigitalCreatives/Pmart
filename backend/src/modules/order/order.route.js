'use strict';

const { Router } = require('express');
const { OrderController } = require('./order.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

// Keyed on the signed-in user, not the IP (client IPs can be forged when the API is called directly).
const checkoutLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 20, key: 'user', message: 'Too many checkout attempts. Please try again later.' });
const otpLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 15, key: 'user', message: 'Too many delivery-code attempts. Please try again later.' });

router.use(protect);

router.post('/checkout', authorize(UserRole.CUSTOMER), checkoutLimiter, OrderController.checkout);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.get('/:id/tracking', OrderController.getTracking);
router.get('/:id/otp', authorize(UserRole.CUSTOMER), OrderController.getCustomerOtp);

router.put('/:id/status', OrderController.updateOrderStatus);
router.post('/:id/assign-rider', OrderController.assignRider);
router.post('/:id/verify-otp', otpLimiter, OrderController.verifyOtp);
router.post('/:id/resend-otp', otpLimiter, OrderController.resendOtp);
router.put('/:id/payment-status', OrderController.updatePaymentStatus);
router.post('/:id/deliver', OrderController.deliverOrder);

module.exports = router;
