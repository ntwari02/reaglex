import { Router } from 'express';
import {
  listProducts,
  trackProductView,
  getProductById,
  getProductBySlug,
  toggleWishlist,
  getWishlistStatus,
  listUserWishlist,
} from '../controllers/productController';
import { cacheMiddleware } from '../middleware/cache';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required for viewing products)
// List all products (with filtering and pagination)
router.get('/', cacheMiddleware(60), listProducts);

// SEO slug detail (canonical URLs: /product/:slug)
router.get('/by-slug/:slug', cacheMiddleware(120), optionalAuthenticate, getProductBySlug);

// Track product view
router.post('/:productId/view', optionalAuthenticate, trackProductView);

// Get product by ID (also tracks view)
router.get('/:productId', optionalAuthenticate, getProductById);

// Wishlist (like/save)
router.get('/wishlist/mine', authenticate, listUserWishlist);
router.get('/:productId/wishlist', optionalAuthenticate, getWishlistStatus);
router.post('/:productId/wishlist', authenticate, toggleWishlist);

export default router;

