import { Router } from 'express';
import { AdminController } from './admin.controller';
import { protect, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../auth/auth.model';

const router = Router();

// All admin routes are protected and require the ADMIN role
router.use(protect);
router.use(authorize(UserRole.ADMIN));

router.get('/dashboard', AdminController.getDashboardStats);
router.get('/orders', AdminController.getOrders);
router.get('/orders/:id', AdminController.getOrderById);
router.patch('/orders/:id/status', AdminController.updateOrderStatus);
router.patch('/orders/:id/assign-rider', AdminController.assignRider);
router.get('/deliveries', AdminController.getActiveDeliveries);
router.get('/reports', AdminController.getReports);
router.get('/customers', AdminController.getCustomers);
router.get('/riders', AdminController.getRiders);
router.get('/users/search', AdminController.searchUsers);
router.get('/riders/eligible', AdminController.getEligibleRiders);
router.post('/riders', AdminController.createRider);
router.put('/riders/:id', AdminController.updateRider);
router.patch('/riders/:id/status', AdminController.updateRiderStatus);
router.delete('/riders/:id', AdminController.deleteRider);
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

export default router;
