import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getReviews,
  updateReviewStatus,
  getModerationQueue,
  getModerationSettings,
  updateModerationSettings,
  getSuspicious,
  removeSuspicious,
  getSellerRatings,
  getSellerResponses,
  updateSellerResponseStatus,
  getMedia,
  getAnalytics,
  getReviewRequestSettings,
  updateReviewRequestSettings,
  getAISettings,
  updateAISettings,
  getIntegrationSettings,
  updateIntegrationSettings,
  getModuleSettings,
  updateModuleSettings,
} from '../controllers/adminReviewsController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/reviews', getReviews);
router.patch('/reviews/:reviewId/status', updateReviewStatus);

router.get('/moderation/queue', getModerationQueue);
router.get('/moderation/settings', getModerationSettings);
router.put('/moderation/settings', updateModerationSettings);

router.get('/suspicious', getSuspicious);
router.delete('/suspicious/:id', removeSuspicious);

router.get('/seller-ratings', getSellerRatings);

router.get('/seller-responses', getSellerResponses);
router.patch('/seller-responses/:responseId/status', updateSellerResponseStatus);

router.get('/media', getMedia);

router.get('/analytics', getAnalytics);

router.get('/review-requests/settings', getReviewRequestSettings);
router.put('/review-requests/settings', updateReviewRequestSettings);

router.get('/ai-settings', getAISettings);
router.put('/ai-settings', updateAISettings);

router.get('/integration-settings', getIntegrationSettings);
router.put('/integration-settings', updateIntegrationSettings);

router.get('/module-settings', getModuleSettings);
router.put('/module-settings', updateModuleSettings);

export default router;
