import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { protect, authorize, authorizePermission } from '../../middleware/auth.middleware';
import { UserRole } from '../auth/auth.model';
import rateLimit from 'express-rate-limit';

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: { success: false, message: 'Too many search requests, please try again later' },
  skip: (req) => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
});

const router = Router();

// Public routes
router.get('/categories', CatalogController.getCategories);
router.get('/categories/:slug', CatalogController.getCategoryBySlug);
router.get('/products', CatalogController.getProducts);
router.get('/products/search', searchLimiter, CatalogController.searchProducts);
router.get('/products/tag/:tag', CatalogController.getProductsByTag);
router.get('/products/slug/:slug', CatalogController.getProductBySlug);
router.get('/products/:id', CatalogController.getProductById);

// Protected Admin/Employee routes for Catalog Management
const requireAdmin = [protect, authorize(UserRole.ADMIN, UserRole.EMPLOYEE)];

router.get('/admin/products', requireAdmin, authorizePermission('catalog.manage'), CatalogController.getAdminProducts);
router.get('/admin/categories', requireAdmin, authorizePermission('catalog.manage'), CatalogController.getAdminCategories);

// Product Management
router.post('/products', requireAdmin, authorizePermission('catalog.manage'), CatalogController.createProduct);
router.put('/products/:id', requireAdmin, authorizePermission('catalog.manage'), CatalogController.updateProduct);
router.patch('/products/:id/status', requireAdmin, authorizePermission('catalog.manage'), CatalogController.updateProductStatus);
router.delete('/products/:id', requireAdmin, authorizePermission('catalog.manage'), CatalogController.deleteProduct);

// Category Management
router.post('/categories', requireAdmin, authorizePermission('catalog.manage'), CatalogController.createCategory);
router.put('/categories/:id', requireAdmin, authorizePermission('catalog.manage'), CatalogController.updateCategory);
router.patch('/categories/:id/status', requireAdmin, authorizePermission('catalog.manage'), CatalogController.updateCategoryStatus);
router.delete('/categories/:id', requireAdmin, authorizePermission('catalog.manage'), CatalogController.deleteCategory);

export default router;
