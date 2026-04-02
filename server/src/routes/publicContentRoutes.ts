import { Router } from 'express';
import { getPublicHomePromoBanners } from '../controllers/buyerHomePromoController';

const router = Router();

router.get('/home-promo-banners', getPublicHomePromoBanners);

export default router;
