'use strict';

const { Router } = require('express');
const { CartController } = require('./cart.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');

const router = Router();

router.use(protect, authorize(UserRole.CUSTOMER));
router.get('/', CartController.getCart);
router.post('/sync', CartController.syncCart);
router.delete('/', CartController.clearCart);

module.exports = router;
