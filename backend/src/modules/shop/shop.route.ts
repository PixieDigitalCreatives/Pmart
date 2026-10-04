import { Router } from 'express';
import { ShopController } from './shop.controller';
import { protect } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { UserRole } from '../auth/auth.model';

const router = Router();

// Public / Customer routes
router.get('/', ShopController.getShops);
router.get('/:id', ShopController.getShopById);

// Protected routes
router.post('/', protect, authorize(UserRole.ADMIN, UserRole.SHOP_OWNER), ShopController.createShop);
router.put('/:id', protect, authorize(UserRole.ADMIN, UserRole.SHOP_OWNER), ShopController.updateShop);

export default router;
