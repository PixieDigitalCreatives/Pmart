'use strict';

const { Router } = require('express');
const { AuthController } = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

const registerLimiter = limiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many registration attempts. Try again in an hour.' });
const loginLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Try again later.' });
const passwordLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many password attempts. Try again later.' });

router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/google', loginLimiter, AuthController.googleLogin);
router.post('/activate', passwordLimiter, AuthController.activateAccount);
router.post('/refresh', AuthController.refresh);

router.post('/complete-profile', protect, registerLimiter, AuthController.completeProfile);
router.post('/logout', protect, AuthController.logout);
router.get('/me', protect, AuthController.me);
router.put('/password', protect, passwordLimiter, AuthController.changePassword);

module.exports = router;
