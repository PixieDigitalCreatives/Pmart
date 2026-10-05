import { Router } from 'express';
import { getRoute } from './routing.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

// Allow authenticated users to fetch routes (riders for delivery, customers for tracking, admin for dashboard)
router.get('/', protect, getRoute);

export default router;
