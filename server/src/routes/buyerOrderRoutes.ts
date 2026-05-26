import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createOrder,
  getBuyerOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
  createSharedCart,
  getSharedCart,
  upsertSharedCartItem,
  updateSharedCartMembers,
  getUnifiedCheckoutIntelligence,
  getCancellationIntelligence,
  pauseOrder,
  confirmPickup,
  confirmDigitalAccess,
  approveServiceCompletion,
  confirmOrderReceipt,
} from '../controllers/buyerOrderController';

const router = Router();

// All routes require authentication except track (which can be used by guests)
router.post('/', authenticate, createOrder);
router.get('/', authenticate, getBuyerOrders);
router.post('/checkout-intelligence', authenticate, getUnifiedCheckoutIntelligence);
router.post('/confirm-pickup', authenticate, confirmPickup);
router.post('/:orderId/confirm-digital-access', authenticate, confirmDigitalAccess);
router.post('/:orderId/approve-service-completion', authenticate, approveServiceCompletion);
router.post('/:orderId/confirm-receipt', authenticate, confirmOrderReceipt);
router.get('/:orderId/cancellation-intelligence', authenticate, getCancellationIntelligence);
router.patch('/:orderId/pause', authenticate, pauseOrder);
router.get('/track/:orderNumber', trackOrder); // Public endpoint for tracking

router.post('/shared-cart', authenticate, createSharedCart);
router.get('/shared-cart/:cartId', authenticate, getSharedCart);
router.post('/shared-cart/:cartId/items', authenticate, upsertSharedCartItem);
router.put('/shared-cart/:cartId/members', authenticate, updateSharedCartMembers);
router.patch('/:orderId/cancel', authenticate, cancelOrder);
router.get('/:orderId', authenticate, getOrderById);

export default router;

