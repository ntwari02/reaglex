import { Router } from 'express';
import { getPublicHomePromoBanners } from '../controllers/buyerHomePromoController';
import { getPublicHeroCarousel } from '../controllers/buyerHeroCarouselController';
import { getPublicReferralProgramStatus } from '../controllers/marketingPublicController';
import { getPublicPaymentGateways } from '../controllers/paymentPublicController';

const router = Router();

router.get('/home-promo-banners', getPublicHomePromoBanners);
router.get('/hero-carousel', getPublicHeroCarousel);
router.get('/marketing/referral-status', getPublicReferralProgramStatus);
router.get('/payment-gateways', getPublicPaymentGateways);

export default router;
