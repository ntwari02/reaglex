import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  adminIntelligencePreview,
  adminIntelligenceReindex,
  adminIntelligenceSearch,
  adminIntelligenceStatus,
} from '../controllers/adminIntelligenceSearchController';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/search', adminIntelligenceSearch);
router.get('/preview/:entityType/:entityId', adminIntelligencePreview);
router.get('/status', adminIntelligenceStatus);
router.post('/reindex', adminIntelligenceReindex);

export default router;
