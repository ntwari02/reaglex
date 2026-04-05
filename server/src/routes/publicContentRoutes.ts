import { Router } from 'express';
import { getPublicHomePromoBanners } from '../controllers/buyerHomePromoController';
import { getPublicReferralProgramStatus } from '../controllers/marketingPublicController';

const router = Router();

router.get('/home-promo-banners', getPublicHomePromoBanners);
router.get('/marketing/referral-status', getPublicReferralProgramStatus);

export default router;
