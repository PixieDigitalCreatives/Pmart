'use strict';

const { Router } = require('express');
const { ShopController } = require('./shop.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');

const router = Router();

router.get('/', ShopController.listPublic);

router.get('/mine', protect, authorize(UserRole.SHOP_OWNER), ShopController.getMine);
router.put('/mine', protect, authorize(UserRole.SHOP_OWNER), ShopController.updateMine);
router.get('/mine/metrics', protect, authorize(UserRole.SHOP_OWNER), ShopController.getMyMetrics);

module.exports = router;
