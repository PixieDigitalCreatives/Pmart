'use strict';

const { Router } = require('express');
const { AdminController } = require('./admin.controller');
const { ShopController } = require('../shop/shop.controller');
const { OrderController, exportOrdersCsv } = require('../order/order.controller');
const { protect, authorize, authorizePermission: can } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

const mutationLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 300, key: 'user', message: 'Too many administrative actions. Please slow down.' });

router.use(protect, authorize(UserRole.ADMIN, UserRole.EMPLOYEE));
router.use((req, res, next) => (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? mutationLimiter(req, res, next) : next()));

router.get('/dashboard', can('dashboard.read'), AdminController.getDashboardStats);
router.get('/reports', can('reports.read'), AdminController.getReports);
router.get('/payments', can('reports.read'), AdminController.getPayments);
router.get('/audit-logs', can('reports.read'), AdminController.getAuditLogs);

// Orders (shared controller; permission checks for writes happen inside via orders.manage)
router.get('/orders', can('orders.read'), OrderController.getOrders);
router.get('/orders/export.csv', can('orders.read'), exportOrdersCsv);
router.get('/orders/:id', can('orders.read'), OrderController.getOrderById);
router.patch('/orders/:id/status', can('orders.manage'), OrderController.updateOrderStatus);
router.patch('/orders/:id/assign-rider', can('orders.manage'), OrderController.assignRider);
router.get('/deliveries', can('orders.read'), AdminController.getActiveDeliveries);

// Stores
router.get('/shops', can('shops.manage'), ShopController.adminList);
router.post('/shops', can('shops.manage'), ShopController.adminCreate);
router.get('/shops/:id', can('shops.manage'), ShopController.adminGet);
router.put('/shops/:id', can('shops.manage'), ShopController.adminUpdate);

// Customers
router.get('/customers', can('customers.read'), AdminController.getCustomers);
router.patch('/customers/:id/status', can('customers.read'), authorize(UserRole.ADMIN), AdminController.setUserActive);

// Riders
router.get('/riders', can('riders.read'), AdminController.getRiders);
router.post('/riders', can('riders.manage'), AdminController.createRider);
router.put('/riders/:id', can('riders.manage'), AdminController.updateRider);
router.patch('/riders/:id/status', can('riders.manage'), AdminController.setRiderActive);
router.post('/riders/:id/reset-password', can('riders.manage'), AdminController.resetRiderPassword);

// Staff
router.get('/employees', can('employees.manage'), AdminController.getEmployees);
router.post('/employees', can('employees.manage'), AdminController.createEmployee);
router.put('/employees/:id', can('employees.manage'), AdminController.updateEmployee);
router.post('/employees/:id/activation-link', can('employees.manage'), AdminController.regenerateActivation);

// Users management (Reset link & Unlock)
router.post('/users/:id/reset-link', authorize(UserRole.ADMIN), AdminController.createPasswordResetLink);
router.post('/users/:id/unlock', authorize(UserRole.ADMIN), AdminController.unlockUser);

// Settings
router.get('/settings', can('settings.read'), AdminController.getSettings);
router.put('/settings', can('settings.manage'), AdminController.updateSettings);

module.exports = router;
