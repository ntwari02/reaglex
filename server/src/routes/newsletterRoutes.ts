import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { subscribeNewsletter } from '../controllers/newsletterController';

const router = Router();

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many subscription attempts. Please try again later.' },
});

router.post('/subscribe', subscribeLimiter, subscribeNewsletter);

export default router;
