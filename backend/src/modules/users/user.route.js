'use strict';

const { Router } = require('express');
const { UserController } = require('./user.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = Router();

router.use(protect);
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);

module.exports = router;
