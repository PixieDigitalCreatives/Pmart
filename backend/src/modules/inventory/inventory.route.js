'use strict';

const { Router } = require('express');
const { InventoryController: C } = require('./inventory.controller');
const { protect, authorize, authorizePermission: can, authorizeAny: any } = require('../../middleware/auth.middleware');
const { UserRole } = require('../auth/auth.model');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

const lookupLimiter = limiter({ windowMs: 60 * 1000, max: 30, key: 'user', message: 'Too many external lookups. Please wait a minute.' });

// In-store inventory is run by staff: ADMIN, or EMPLOYEE with the listed permission(s).
router.use(protect, authorize(UserRole.ADMIN, UserRole.EMPLOYEE));

router.get('/fields', C.fields);
router.get('/lookup', any('inventory.read', 'inventory.restock', 'invoices.create', 'catalog.manage'), C.lookup);
router.get('/barcode-check', any('inventory.read', 'catalog.manage'), C.barcodeCheck);
router.get('/external-lookup', can('catalog.manage'), lookupLimiter, C.externalLookup);
router.get('/export.csv', can('inventory.read'), C.exportCsv);

router.get('/imports', can('catalog.import'), C.listImports);
router.post('/imports/preview', can('catalog.import'), C.previewImport);
router.get('/imports/:id', can('catalog.import'), C.getImport);
router.get('/imports/:id/report.csv', can('catalog.import'), C.importReportCsv);
router.post('/imports/:id/commit', can('catalog.import'), C.commitImport);
router.post('/imports/:id/rollback', authorize(UserRole.ADMIN), C.rollbackImport);

router.get('/suppliers', any('inventory.restock', 'inventory.read'), C.suppliers);
router.post('/restocks', can('inventory.restock'), C.restock);
router.get('/restocks', any('inventory.read', 'inventory.restock'), C.listRestocks);
router.post('/adjustments', can('inventory.adjust'), C.adjust);
router.get('/transactions', can('inventory.read'), C.transactions);

router.get('/images', any('inventory.read', 'images.verify'), C.imageQueue);
router.post('/images/find-candidates', any('images.verify', 'catalog.manage'), C.findCandidates);
router.get('/images/:imageId/file', any('inventory.read', 'images.verify', 'catalog.manage'), C.imageFile);
router.post('/images/:imageId/approve', can('images.verify'), C.approveImage);
router.post('/images/:imageId/reject', can('images.verify'), C.rejectImage);
router.get('/products/:id/images', any('inventory.read', 'images.verify', 'catalog.manage'), C.productImages);
router.post('/products/:id/images/upload', any('catalog.manage', 'images.verify'), C.uploadImage);
router.post('/products/:id/images/url', any('catalog.manage', 'images.verify'), C.addImageUrl);

module.exports = router;
