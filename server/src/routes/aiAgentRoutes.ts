import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { postAiAgent, postAiCheckout } from '../controllers/aiAgentController';

const router = Router();

// Optional auth; server-side tool guards still enforce permissions.
router.post('/agent', optionalAuthenticate, postAiAgent);

/** Buyer-only: structured checkout from assistant UI buttons (same backend as checkoutSingleProduct tool). */
router.post('/checkout', authenticate, postAiCheckout);

export default router;

