'use strict';

const { Router } = require('express');
const { getRoute } = require('./routing.controller');
const { protect } = require('../../middleware/auth.middleware');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

router.get('/', protect, limiter({ windowMs: 60 * 1000, max: 30, key: 'user', message: 'Too many route requests' }), getRoute);

module.exports = router;
