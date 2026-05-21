import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboard,
  getBuyerInsightsOverview,
  getBuyerInsightsList,
  getBuyerInsightByUser,
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
  getAutomationOverview,
  updateAutomationFlow,
  updateAutomationGlobals,
  runAutomationFlow,
  testAutomationEmail,
  sendAutomationPush,
  getAutomationRecentSends,
} from '../controllers/adminMarketingController';
import {
  getCartStrategy,
  updateCartStrategy,
  saveCartJourney,
  simulateCartRecovery,
  getCartRecoverySettings,
  updateCartRecoverySettings,
  getCartRecoveryAnalytics,
  getCartTimeline,
} from '../controllers/cartRecoveryController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Buyer insights (admin dashboard)
router.get('/buyer-insights/overview', getBuyerInsightsOverview);
router.get('/buyer-insights', getBuyerInsightsList);
router.get('/buyer-insights/:userId', getBuyerInsightByUser);

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

// Abandoned cart recovery engine (admin SSOT + queue)
router.get('/cart-recovery/settings', getCartRecoverySettings);
router.put('/cart-recovery/settings', updateCartRecoverySettings);
router.get('/cart-recovery/analytics', getCartRecoveryAnalytics);
router.get('/cart-recovery/:cartId/timeline', getCartTimeline);

// Smart recovery schedule (legacy aliases)
router.get('/cart-strategy', getCartStrategy);
router.put('/cart-strategy', updateCartStrategy);
router.post('/cart/journey', saveCartJourney);
router.post('/cart/simulate', simulateCartRecovery);

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

// Marketing automation engine
router.get('/automation/overview', getAutomationOverview);
router.put('/automation/globals', updateAutomationGlobals);
router.patch('/automation/flows/:flow', updateAutomationFlow);
router.post('/automation/flows/:flow/run', runAutomationFlow);
router.post('/automation/test-email', testAutomationEmail);
router.post('/automation/push', sendAutomationPush);
router.get('/automation/recent', getAutomationRecentSends);

export default router;
