import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getKycQueues, getSellerKycQueueDetail } from '../controllers/adminKycQueueController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', getKycQueues);
router.get('/sellers/:sellerId', getSellerKycQueueDetail);

export default router;
