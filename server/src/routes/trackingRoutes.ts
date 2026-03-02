import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  trackOrder,
  getMyOrders,
  addTrackingEvent,
  updateShipmentLocation,
  confirmDelivery,
  recordFailedDelivery,
} from '../controllers/trackingController';

const router = Router();

// Public routes (for tracking)
router.get('/:identifier', trackOrder); // Track by order number or tracking number

// Authenticated routes
router.get('/my-orders', authenticate, getMyOrders);

// Seller/Admin routes (for updating tracking)
router.post('/events', authenticate, authorize('seller', 'admin'), addTrackingEvent);
router.patch(
  '/shipments/:shipmentId/location',
  authenticate,
  authorize('seller', 'admin'),
  updateShipmentLocation
);
router.post(
  '/shipments/:shipmentId/confirm-delivery',
  authenticate,
  authorize('seller', 'admin'),
  confirmDelivery
);
router.post(
  '/shipments/:shipmentId/failed-delivery',
  authenticate,
  authorize('seller', 'admin'),
  recordFailedDelivery
);

export default router;

