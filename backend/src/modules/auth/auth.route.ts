import { Router } from 'express';
import { AuthController } from './auth.controller';
import { protect } from '../../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 registrations per hour
  message: { success: false, message: 'Too many registration attempts from this IP, please try again after an hour' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login requests per window
  message: { success: false, message: 'Too many login attempts, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 password changes per hour
  message: { success: false, message: 'Too many password change attempts, please try again after an hour' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const router = Router();

// Mobile & Password Auth
router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/setup-password', protect, passwordLimiter, AuthController.setupPassword);
router.post('/enroll-rider', registerLimiter, AuthController.enrollRider);

// Google Auth & Profile Completion
router.post('/google', loginLimiter, AuthController.googleLogin);
router.post('/complete-profile', protect, registerLimiter, AuthController.completeProfile);

// Session management
router.post('/refresh', AuthController.refresh);
router.post('/logout', protect, AuthController.logout);
router.get('/me', protect, AuthController.me);
router.put('/password', protect, passwordLimiter, AuthController.changePassword);

export default router;
