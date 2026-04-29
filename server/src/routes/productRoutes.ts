import { Router } from 'express';
import { listProducts, trackProductView, getProductById } from '../controllers/productController';
import { cacheMiddleware } from '../middleware/cache';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required for viewing products)
// List all products (with filtering and pagination)
router.get('/', cacheMiddleware(60), listProducts);

// Track product view
router.post('/:productId/view', optionalAuthenticate, trackProductView);

// Get product by ID (also tracks view)
router.get('/:productId', optionalAuthenticate, getProductById);

export default router;

