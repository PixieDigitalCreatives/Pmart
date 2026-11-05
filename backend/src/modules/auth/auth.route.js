'use strict';

const { Router } = require('express');
const { AuthController } = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

const registerLimiter = limiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many registration attempts. Try again in an hour.' });
const loginLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Try again later.' });
// Per account, whatever the caller's IP: failed sign-ins to one mobile number (IP-based limits can be dodged).
const accountLoginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  key: 'phone',
  failuresOnly: true,
  message: 'Too many failed sign-in attempts for this number. Try again in 15 minutes.'
});
const passwordLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 10, key: 'user', message: 'Too many password attempts. Try again later.' });
const profileLimiter = limiter({ windowMs: 60 * 60 * 1000, max: 10, key: 'user', message: 'Too many attempts. Try again in an hour.' });

router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, accountLoginLimiter, AuthController.login);
router.post('/mfa/verify', loginLimiter, AuthController.verifyMfa);
router.post('/google', loginLimiter, AuthController.googleLogin);
router.post('/activate', passwordLimiter, AuthController.activateAccount);
router.post('/reset-password', passwordLimiter, AuthController.resetPassword);
router.post('/refresh', AuthController.refresh);

router.post('/complete-profile', protect, profileLimiter, AuthController.completeProfile);
router.post('/logout', protect, AuthController.logout);
router.get('/me', protect, AuthController.me);
router.put('/password', protect, passwordLimiter, AuthController.changePassword);

router.get('/sessions', protect, AuthController.listSessions);
router.post('/sessions/revoke-others', protect, AuthController.revokeOtherSessions);
router.post('/sessions/revoke-all', protect, AuthController.revokeAllSessions);
router.post('/socket-ticket', protect, AuthController.getSocketTicket);

module.exports = router;
