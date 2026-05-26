import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth';
import { getPublicHomePromoBanners } from '../controllers/buyerHomePromoController';
import { getPublicHeroCarousel } from '../controllers/buyerHeroCarouselController';
import { getPublicReferralProgramStatus } from '../controllers/marketingPublicController';
import { getPublicPaymentGateways } from '../controllers/paymentPublicController';
import { createAdvertisingInquiry } from '../controllers/sellerAdvertisingController';
import { getPublicFeeSchedule } from '../controllers/sellerFeeScheduleController';

const router = Router();

router.get('/home-promo-banners', getPublicHomePromoBanners);
router.get('/hero-carousel', getPublicHeroCarousel);
router.get('/marketing/referral-status', getPublicReferralProgramStatus);
router.get('/payment-gateways', getPublicPaymentGateways);
router.post('/advertising/inquiries', optionalAuthenticate, createAdvertisingInquiry);
router.get('/fee-schedule', getPublicFeeSchedule);

export default router;
