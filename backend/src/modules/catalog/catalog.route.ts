import { Router } from 'express';
import { CatalogController } from './catalog.controller';
import { protect, authorize, authorizePermission } from '../../middleware/auth.middleware';
import { UserRole } from '../auth/auth.model';

const router = Router();

// Public routes
router.get('/categories', CatalogController.getCategories);
router.get('/categories/:slug', CatalogController.getCategoryBySlug);
router.get('/products', CatalogController.getProducts);
router.get('/products/search', CatalogController.searchProducts);
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
