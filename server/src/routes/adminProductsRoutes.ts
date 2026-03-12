import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getProductFacets,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkProducts,
  getProductAnalytics,
  getProductLogs,
} from '../controllers/adminProductsController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/facets', getProductFacets);
router.post('/bulk', bulkProducts);
router.get('/', getProducts);
router.get('/:productId', getProduct);
router.post('/', createProduct);
router.patch('/:productId', updateProduct);
router.delete('/:productId', deleteProduct);
router.get('/:productId/analytics', getProductAnalytics);
router.get('/:productId/logs', getProductLogs);

export default router;
