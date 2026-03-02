import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  applyForAffiliate,
  getMyAffiliateAccount,
  generateAffiliateLink,
  trackClick,
  getAffiliateLinks,
  getAffiliateAnalytics,
  requestPayout,
  getPayouts,
  getAllAffiliates,
  updateAffiliateStatus,
  processPayout,
  recordConversion,
} from '../controllers/affiliateController';

const router = Router();

// Public routes (for tracking)
router.post('/track/:linkId', trackClick);
router.post('/conversion', recordConversion); // Called by order system

// Authenticated affiliate routes
router.post('/apply', authenticate, applyForAffiliate);
router.get('/me', authenticate, getMyAffiliateAccount);
router.post('/links', authenticate, generateAffiliateLink);
router.get('/links', authenticate, getAffiliateLinks);
router.get('/analytics', authenticate, getAffiliateAnalytics);
router.post('/payouts/request', authenticate, requestPayout);
router.get('/payouts', authenticate, getPayouts);

// Admin routes
router.get('/admin/all', authenticate, authorize('admin'), getAllAffiliates);
router.patch('/admin/:affiliateId/status', authenticate, authorize('admin'), updateAffiliateStatus);
router.patch('/admin/payouts/:payoutId', authenticate, authorize('admin'), processPayout);

export default router;

