'use strict';

const { Router } = require('express');
const { BillingController: C } = require('./billing.controller');
const { protect, authorize, authorizePermission: can, authorizeAny: any } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');

const router = Router();

// In-store billing is run by staff: ADMIN, or EMPLOYEE with the listed permission(s).
router.use(protect, authorize(UserRole.ADMIN, UserRole.EMPLOYEE));

router.get('/dashboard', any('invoices.read', 'payments.read'), C.dashboard);
router.get('/settings', any('invoices.create', 'invoices.read'), C.settings);
router.get('/customers', any('invoices.create', 'invoices.read'), C.customers);
router.post('/customers', any('invoices.create', 'invoices.read'), C.createCustomer);
router.get('/customers/:id', any('invoices.create', 'invoices.read'), C.getCustomer);
router.put('/customers/:id', any('invoices.create', 'invoices.read'), C.updateCustomer);
router.get('/customers/:id/statement', any('invoices.create', 'invoices.read'), C.getCustomerStatement);
router.get('/outstandings', any('invoices.read', 'payments.read'), C.listOutstandings);

router.post('/invoices', can('invoices.create'), C.createInvoice);
router.get('/invoices', can('invoices.read'), C.listInvoices);
router.get('/invoices/:id', can('invoices.read'), C.getInvoice);
router.delete('/invoices/:id', authorize(UserRole.ADMIN), C.deleteInvoice);
router.get('/invoices/:id/pdf', can('invoices.read'), C.invoicePdf);
router.get('/invoices/:id/movements', any('invoices.read', 'inventory.read'), C.invoiceMovements);
router.post('/invoices/:id/payments', can('payments.record'), C.recordPayment);
router.post('/invoices/:id/refunds', can('invoices.cancel'), C.recordRefund);
router.post('/invoices/:id/cancel', can('invoices.cancel'), C.cancelInvoice);
router.post('/invoices/:id/returns', can('invoices.cancel'), C.returnItems);

router.get('/payments', can('payments.read'), C.listPayments);

module.exports = router;
