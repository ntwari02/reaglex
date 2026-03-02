import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  getUnreadCount,
} from '../controllers/systemNotificationController';

const router = Router();

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Get notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark as read
router.post('/:notificationId/read', markAsRead);

export default router;

