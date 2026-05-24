import { Router } from 'express';
import { validateCoupon } from '../controllers/couponPublicController';

const router = Router();

router.get('/validate', validateCoupon);

export default router;
