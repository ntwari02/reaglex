import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getBuyerReferral } from '../controllers/buyerReferralController';

const router = Router();

router.use(authenticate);
router.get('/', getBuyerReferral);

export default router;
