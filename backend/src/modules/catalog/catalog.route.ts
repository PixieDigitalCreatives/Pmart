import { Router } from 'express';
import { CatalogController } from './catalog.controller';

const router = Router();

router.get('/categories', CatalogController.getCategories);
router.get('/categories/:slug', CatalogController.getCategoryBySlug);
router.get('/products', CatalogController.getProducts);
router.get('/products/search', CatalogController.searchProducts);
router.get('/products/tag/:tag', CatalogController.getProductsByTag);
router.get('/products/slug/:slug', CatalogController.getProductBySlug);
router.get('/products/:id', CatalogController.getProductById);

export default router;
