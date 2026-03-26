import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBuyerNotifications,
  getBuyerUnreadNotificationCount,
} from '../controllers/buyerNotificationController';

const router = Router();

router.use(authenticate);
router.get('/', getBuyerNotifications);
router.get('/unread-count', getBuyerUnreadNotificationCount);

export default router;
