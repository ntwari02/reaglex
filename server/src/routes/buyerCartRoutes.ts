import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getBuyerCloudCart, syncBuyerCloudCart } from '../controllers/buyerCartController';

const router = Router();

router.get('/', authenticate, getBuyerCloudCart);
router.put('/sync', authenticate, syncBuyerCloudCart);

export default router;
