import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAccountHealth } from '../controllers/accountHealthController';

const router = Router();

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorize('seller', 'admin'));

// Get account health
router.get('/', getAccountHealth);

export default router;

