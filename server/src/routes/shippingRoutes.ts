import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { postShippingEstimatePublic, postShippingQuote } from '../controllers/shippingQuoteController';
import {
  listPublicDestinations,
  resolveDestination,
} from '../controllers/deliveryDestinationController';
import { getPublicPlatformContext } from '../controllers/platformShippingPolicyController';

const router = Router();

router.get('/platform-context', getPublicPlatformContext);
router.get('/destinations', listPublicDestinations);
router.get('/destinations/resolve', resolveDestination);
router.post('/estimate', postShippingEstimatePublic);
router.post('/quote', authenticate, postShippingQuote);

export default router;
