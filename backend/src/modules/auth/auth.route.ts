import { Router } from 'express';
import { AuthController } from './auth.controller';
import { protect } from '../../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth routes
  message: { success: false, message: 'Too many authentication attempts, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const router = Router();

// Mobile & Password Auth
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/setup-password', protect, authLimiter, AuthController.setupPassword);
router.post('/enroll-rider', authLimiter, AuthController.enrollRider);

// Google Auth & Profile Completion
router.post('/google', authLimiter, AuthController.googleLogin);
router.post('/complete-profile', protect, authLimiter, AuthController.completeProfile);

// Session management
router.post('/refresh', AuthController.refresh);
router.post('/logout', protect, AuthController.logout);
router.get('/me', protect, AuthController.me);
router.put('/password', protect, authLimiter, AuthController.changePassword);

export default router;
