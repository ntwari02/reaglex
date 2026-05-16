import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAdminHomePromoBanners, putAdminHomePromoBanners } from '../controllers/buyerHomePromoController';
import { getAdminHeroCarousel, putAdminHeroCarousel } from '../controllers/buyerHeroCarouselController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/home-promo-banners', getAdminHomePromoBanners);
router.put('/home-promo-banners', putAdminHomePromoBanners);
router.get('/hero-carousel', getAdminHeroCarousel);
router.put('/hero-carousel', putAdminHeroCarousel);

export default router;
