import { Router } from 'express';
import { CartController } from './cart.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', CartController.getCart);
router.post('/sync', CartController.syncCart);
router.delete('/', CartController.clearCart);

export default router;
