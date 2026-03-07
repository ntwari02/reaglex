import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  getMessageCampaigns,
  createMessageCampaign,
  updateMessageCampaign,
  deleteMessageCampaign,
  getAbandonedCarts,
  getAbandonedCartSettings,
  updateAbandonedCartSettings,
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getAdIntegrations,
  createAdIntegration,
  updateAdIntegration,
  deleteAdIntegration,
  getPixels,
  createPixel,
  updatePixel,
  deletePixel,
  getCreatives,
  createCreative,
  updateCreative,
  deleteCreative,
  getReferralSettings,
  updateReferralSettings,
  getReferralStats,
  getAnalytics,
  getAISettings,
  updateAISettings,
  getMarketingSettings,
  updateMarketingSettings,
} from '../controllers/adminMarketingController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Campaigns
router.get('/campaigns', getCampaigns);
router.post('/campaigns', createCampaign);
router.patch('/campaigns/:campaignId', updateCampaign);
router.delete('/campaigns/:campaignId', deleteCampaign);

// Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:couponId', updateCoupon);
router.delete('/coupons/:couponId', deleteCoupon);

// Segments
router.get('/segments', getSegments);
router.post('/segments', createSegment);
router.patch('/segments/:segmentId', updateSegment);
router.delete('/segments/:segmentId', deleteSegment);

// Message campaigns
router.get('/message-campaigns', getMessageCampaigns);
router.post('/message-campaigns', createMessageCampaign);
router.patch('/message-campaigns/:campaignId', updateMessageCampaign);
router.delete('/message-campaigns/:campaignId', deleteMessageCampaign);

// Abandoned carts
router.get('/abandoned-carts', getAbandonedCarts);
router.get('/abandoned-carts/settings', getAbandonedCartSettings);
router.put('/abandoned-carts/settings', updateAbandonedCartSettings);

// Promotions
router.get('/promotions', getPromotions);
router.post('/promotions', createPromotion);
router.patch('/promotions/:promotionId', updatePromotion);
router.delete('/promotions/:promotionId', deletePromotion);

// Ad integrations
router.get('/ad-integrations', getAdIntegrations);
router.post('/ad-integrations', createAdIntegration);
router.patch('/ad-integrations/:integrationId', updateAdIntegration);
router.delete('/ad-integrations/:integrationId', deleteAdIntegration);

// Pixels
router.get('/pixels', getPixels);
router.post('/pixels', createPixel);
router.patch('/pixels/:pixelId', updatePixel);
router.delete('/pixels/:pixelId', deletePixel);

// Creatives
router.get('/creatives', getCreatives);
router.post('/creatives', createCreative);
router.patch('/creatives/:creativeId', updateCreative);
router.delete('/creatives/:creativeId', deleteCreative);

// Referral
router.get('/referral/settings', getReferralSettings);
router.put('/referral/settings', updateReferralSettings);
router.get('/referral/stats', getReferralStats);

// Analytics
router.get('/analytics', getAnalytics);

// AI settings
router.get('/ai-settings', getAISettings);
router.put('/ai-settings', updateAISettings);

// Marketing settings
router.get('/settings', getMarketingSettings);
router.put('/settings', updateMarketingSettings);

export default router;
