import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/adminAccess';
import { getAdminHomePromoBanners, putAdminHomePromoBanners } from '../controllers/buyerHomePromoController';
import { getAdminHeroCarousel, putAdminHeroCarousel } from '../controllers/buyerHeroCarouselController';
import {
  getAdminHomeLayout,
  postAdminHomeLayoutPublish,
  postAdminHomeLayoutReset,
  putAdminHomeLayoutDraft,
} from '../controllers/buyerHomeLayoutController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/home-promo-banners', getAdminHomePromoBanners);
router.put('/home-promo-banners', putAdminHomePromoBanners);
router.get('/hero-carousel', getAdminHeroCarousel);
router.put('/hero-carousel', putAdminHeroCarousel);

/** Legacy paths — super admin only; prefer /api/admin/system-features/home-layout */
router.use('/home-product-layout', requireSuperAdmin);
router.get('/home-product-layout', getAdminHomeLayout);
router.put('/home-product-layout', putAdminHomeLayoutDraft);
router.post('/home-product-layout/reset', postAdminHomeLayoutReset);
router.post('/home-product-layout/publish', postAdminHomeLayoutPublish);

export default router;
