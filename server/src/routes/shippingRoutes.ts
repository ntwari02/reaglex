import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { postShippingEstimatePublic, postShippingQuote } from '../controllers/shippingQuoteController';

const router = Router();

router.post('/estimate', postShippingEstimatePublic);
router.post('/quote', authenticate, postShippingQuote);

export default router;
