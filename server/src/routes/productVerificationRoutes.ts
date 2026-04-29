import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createOrUpdateVerificationRecord,
  getSellerTrustProfile,
  getVerificationStatus,
  listSuspiciousProductsForAdmin,
  runAiVerification,
  updateSellerTrustScore,
} from '../controllers/productVerificationController';

const router = Router();

router.get('/status/:productId', getVerificationStatus);
router.get('/seller-trust/:sellerId', getSellerTrustProfile);

router.use(authenticate);
router.post('/records', createOrUpdateVerificationRecord);
router.post('/ai-check', runAiVerification);
router.get('/seller-trust', getSellerTrustProfile);

router.get('/suspicious', authorize('admin'), listSuspiciousProductsForAdmin);
router.patch('/seller-trust/adjust', authorize('admin'), updateSellerTrustScore);

export default router;

