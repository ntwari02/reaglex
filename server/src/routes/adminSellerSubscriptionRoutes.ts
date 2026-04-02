import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  adminListSubscriptionPlans,
  adminListSellerSubscriptions,
  adminGetSellerSubscription,
  adminAssignSellerTier,
  adminSetSellerSubscriptionStatus,
  adminCancelSellerSubscription,
  adminSetSellerAutoRenew,
} from '../controllers/adminSellerSubscriptionController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/plans', adminListSubscriptionPlans);
router.get('/', adminListSellerSubscriptions);
router.get('/seller/:userId', adminGetSellerSubscription);
router.patch('/seller/:userId/tier', adminAssignSellerTier);
router.patch('/seller/:userId/status', adminSetSellerSubscriptionStatus);
router.patch('/seller/:userId/cancel', adminCancelSellerSubscription);
router.patch('/seller/:userId/auto-renew', adminSetSellerAutoRenew);

export default router;
