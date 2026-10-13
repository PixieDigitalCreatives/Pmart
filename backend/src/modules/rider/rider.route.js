'use strict';

const { Router } = require('express');
const { RiderController } = require('./rider.controller');
const { protect, authorize, hasPermission } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

const locationLimiter = limiter({ windowMs: 60 * 1000, max: 40, message: 'Too many location updates' });

const canDispatch = (req, res, next) => {
  const u = req.user;
  if (u.role === UserRole.SHOP_OWNER || hasPermission(u, 'riders.read') || hasPermission(u, 'orders.manage')) return next();
  return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'You are not allowed to view the rider fleet' });
};

router.use(protect);

router.get('/fleet', canDispatch, RiderController.listFleet);

router.use(authorize(UserRole.RIDER));
router.get('/profile', RiderController.getProfile);
router.put('/profile', RiderController.updateVehicle);
router.patch('/availability', RiderController.setAvailability);
router.get('/active-order', RiderController.getActiveOrder);
router.post('/orders/:id/pickup', RiderController.pickupOrder);
router.post('/location', locationLimiter, RiderController.updateLocation);

module.exports = router;
