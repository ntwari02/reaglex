import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { postShippingQuote } from '../controllers/shippingQuoteController';

const router = Router();

router.post('/quote', authenticate, postShippingQuote);

export default router;
