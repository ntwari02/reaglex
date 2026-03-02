import { Router } from 'express';
import { listProducts, trackProductView, getProductById } from '../controllers/productController';

const router = Router();

// Public routes (no authentication required for viewing products)
// List all products (with filtering and pagination)
router.get('/', listProducts);

// Track product view
router.post('/:productId/view', trackProductView);

// Get product by ID (also tracks view)
router.get('/:productId', getProductById);

export default router;

