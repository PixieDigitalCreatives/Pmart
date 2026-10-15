'use strict';

const { Router } = require('express');
const { CatalogController } = require('./catalog.controller');
const { protect, authorizePermission } = require('../../middleware/auth.middleware');
const { limiter } = require('../../middleware/rate-limit');

const router = Router();

const searchLimiter = limiter({ windowMs: 60 * 1000, max: 60, message: 'Too many search requests. Please slow down.' });

// Storefront (public)
router.get('/categories', CatalogController.getCategories);
router.get('/categories/:slug', CatalogController.getCategoryBySlug);
router.get('/products', searchLimiter, CatalogController.getProducts);
router.get('/products/search', searchLimiter, CatalogController.searchProducts);
router.get('/products/tag/:tag', CatalogController.getProductsByTag);
router.get('/products/slug/:slug', CatalogController.getProductBySlug);
router.get('/products/:id', CatalogController.getProductById);

// Catalog management: ADMIN, EMPLOYEE(catalog.manage), SHOP_OWNER (own store; enforced in the controller)
router.get('/manage/products', protect, CatalogController.getManagedProducts);
router.post('/manage/products/bulk', protect, CatalogController.bulkCreateProducts);
router.post('/manage/products/bulk-delete', protect, CatalogController.bulkDeleteProducts);
router.patch('/manage/products/bulk-update', protect, CatalogController.bulkUpdateProducts);
router.post('/manage/products/bulk-update', protect, CatalogController.bulkUpdateProducts);
router.get('/manage/products/:id', protect, CatalogController.getManagedProduct);
router.post('/manage/products', protect, CatalogController.createProduct);
router.put('/manage/products/:id', protect, CatalogController.updateProduct);
router.patch('/manage/products/:id/status', protect, CatalogController.updateProductStatus);
router.delete('/manage/products/:id', protect, CatalogController.archiveProduct);

router.get('/manage/categories', protect, CatalogController.getManagedCategories);
router.post('/manage/categories', protect, authorizePermission('catalog.manage'), CatalogController.createCategory);
router.put('/manage/categories/:id', protect, authorizePermission('catalog.manage'), CatalogController.updateCategory);
router.patch('/manage/categories/:id/status', protect, authorizePermission('catalog.manage'), CatalogController.updateCategoryStatus);
router.delete('/manage/categories/:id', protect, authorizePermission('catalog.manage'), CatalogController.deleteCategory);

module.exports = router;
