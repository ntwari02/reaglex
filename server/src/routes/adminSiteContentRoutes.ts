import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAdminHomePromoBanners, putAdminHomePromoBanners } from '../controllers/buyerHomePromoController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/home-promo-banners', getAdminHomePromoBanners);
router.put('/home-promo-banners', putAdminHomePromoBanners);

export default router;
