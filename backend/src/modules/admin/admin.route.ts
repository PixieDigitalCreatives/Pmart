import { Router } from 'express';
import { AdminController } from './admin.controller';
import { protect, authorize, authorizePermission } from '../../middleware/auth.middleware';
import { UserRole } from '../auth/auth.model';
import rateLimit from 'express-rate-limit';

const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 mutations per 15 minutes
  message: { success: false, message: 'Too many administrative actions, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const router = Router();

// All admin routes are protected and require the ADMIN or EMPLOYEE role
router.use(protect);
router.use(authorize(UserRole.ADMIN, UserRole.EMPLOYEE));
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return adminMutationLimiter(req, res, next);
  }
  next();
});

// Dashboard stats (viewable by anyone with dashboard access)
router.get('/dashboard', authorizePermission('dashboard.read'), AdminController.getDashboardStats);

// Orders
router.get('/orders', authorizePermission('orders.read'), AdminController.getOrders);
router.get('/orders/:id', authorizePermission('orders.read'), AdminController.getOrderById);
router.patch('/orders/:id/status', authorizePermission('orders.manage'), AdminController.updateOrderStatus);
router.patch('/orders/:id/assign-rider', authorizePermission('orders.manage'), AdminController.assignRider);
router.get('/deliveries', authorizePermission('orders.read'), AdminController.getActiveDeliveries);

// Reports
router.get('/reports', authorizePermission('reports.read'), AdminController.getReports);

// Customers
router.get('/customers', authorizePermission('customers.read'), AdminController.getCustomers);
router.get('/users/search', authorizePermission('customers.read'), AdminController.searchUsers);

// Riders
router.get('/riders', authorizePermission('riders.read'), AdminController.getRiders);
router.get('/riders/eligible', authorizePermission('riders.read'), AdminController.getEligibleRiders);
router.post('/riders', authorizePermission('riders.manage'), AdminController.createRider);
router.put('/riders/:id', authorizePermission('riders.manage'), AdminController.updateRider);
router.patch('/riders/:id/status', authorizePermission('riders.manage'), AdminController.updateRiderStatus);
router.delete('/riders/:id', authorizePermission('riders.manage'), AdminController.deleteRider);

// Employees (Super admin only or specific employee permission)
router.get('/employees', authorizePermission('employees.manage'), AdminController.getEmployees);
router.post('/employees', authorizePermission('employees.manage'), AdminController.createEmployee);
router.put('/employees/:id', authorizePermission('employees.manage'), AdminController.updateEmployee);
router.delete('/employees/:id', authorizePermission('employees.manage'), AdminController.deleteEmployee);

// Settings
router.get('/settings', authorizePermission('settings.read'), AdminController.getSettings);
router.put('/settings', authorizePermission('settings.manage'), AdminController.updateSettings);

// Audit Logs
router.get('/audit-logs', authorizePermission('reports.read'), AdminController.getAuditLogs);

export default router;
