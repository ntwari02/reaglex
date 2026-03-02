import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createOrder,
  getBuyerOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
} from '../controllers/buyerOrderController';

const router = Router();

// All routes require authentication except track (which can be used by guests)
router.post('/', authenticate, createOrder);
router.get('/', authenticate, getBuyerOrders);
router.get('/:orderId', authenticate, getOrderById);
router.patch('/:orderId/cancel', authenticate, cancelOrder);
router.get('/track/:orderNumber', trackOrder); // Public endpoint for tracking

export default router;

