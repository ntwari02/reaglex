import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getKycStatus,
  startKycOnboarding,
  completeKycLater,
} from '../controllers/sellerKycController';

const router = Router();

router.use(authenticate, authorize('seller'));

router.get('/status', getKycStatus);
router.post('/onboarding/start', startKycOnboarding);
router.post('/onboarding/complete-later', completeKycLater);

export default router;
