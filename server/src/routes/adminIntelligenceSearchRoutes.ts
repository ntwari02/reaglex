import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth';
import {
  adminIntelligenceConfig,
  adminIntelligencePreview,
  adminIntelligenceReindex,
  adminIntelligenceSearch,
  adminIntelligenceSetPlatformAi,
  adminIntelligenceSetPreferences,
  adminIntelligenceStatus,
  adminIntelligenceSuggest,
} from '../controllers/adminIntelligenceSearchController';
import { requireSuperAdmin } from '../middleware/adminAccess';

const router = Router();

const intelSearchLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many searches. Wait a moment and try again.' },
});

const intelPreviewLimiter = rateLimit({
  windowMs: 60_000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many preview requests.' },
});

const intelAiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI assist rate limit — try again shortly.' },
});

router.use(authenticate);
router.use(authorize('admin'));

router.get('/config', adminIntelligenceConfig);
router.patch('/preferences', intelAiLimiter, adminIntelligenceSetPreferences);
router.patch('/settings', requireSuperAdmin, adminIntelligenceSetPlatformAi);
router.get('/suggest', intelAiLimiter, adminIntelligenceSuggest);
router.get('/search', intelSearchLimiter, adminIntelligenceSearch);
router.get('/preview/:entityType/:entityId', intelPreviewLimiter, adminIntelligencePreview);
router.get('/status', adminIntelligenceStatus);
router.post('/reindex', requireSuperAdmin, adminIntelligenceReindex);

export default router;
