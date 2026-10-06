import { Router } from 'express';
import { UserController } from './user.controller';
import { protect } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { UserRole } from '../auth/auth.model';

const router = Router();

router.use(protect); // All user routes require authentication

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);

// Addresses are now handled in the address module under /api/addresses

export default router;
