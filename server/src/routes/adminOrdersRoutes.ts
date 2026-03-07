import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getOrderFacets,
  getOrders,
  getOrder,
  updateOrderStatus,
  getOrderLogs,
} from '../controllers/adminOrdersController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/facets', getOrderFacets);
router.get('/', getOrders);
router.get('/:orderId', getOrder);
router.patch('/:orderId/status', updateOrderStatus);
router.get('/:orderId/logs', getOrderLogs);

export default router;
