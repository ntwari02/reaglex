import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateCoupon } from '../controllers/couponPublicController';

const router = Router();

const validateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many coupon checks. Please try again later.' },
});

router.get('/validate', validateLimiter, validateCoupon);

export default router;
