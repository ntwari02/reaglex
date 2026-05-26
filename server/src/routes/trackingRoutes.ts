import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// Authenticated routes (must be registered before /:identifier)
router.get('/my-orders', authenticate, getMyOrders);

const trackGuestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many tracking attempts. Please try again later.' },
});

// Public guest tracking — requires matching email or phone query param
router.get('/:identifier', trackGuestLimiter, trackOrder);

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

