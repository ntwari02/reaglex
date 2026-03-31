import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import {
  getSecurityOverview,
  getSecurityFindings,
  getAttackSurface,
  getSecurityEvents,
  getComplianceOwasp,
  runSecurityScan,
} from '../services/securityAnalysis.service';
import { getAuthSecurityEvents, getUserSellerBehavior } from '../services/systemMonitor.service';
import {
  getIntelligenceSnapshot,
  recordTelemetry,
  logAdminSessionViewerAccess,
  type UserRole,
} from '../services/securityIntelligence.service';

const router = Router();

/** Client route telemetry (any authenticated role) — throttled server-side */
router.post('/telemetry', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const body = req.body as { path?: string; action?: string; category?: string };
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : '') ||
      req.socket.remoteAddress ||
      '';
    recordTelemetry(
      String(req.user.id),
      (req.user.role as UserRole) || 'buyer',
      {
        path: typeof body.path === 'string' ? body.path : '/',
        action: typeof body.action === 'string' ? body.action : undefined,
        category: typeof body.category === 'string' ? body.category : undefined,
      },
      ip,
      req.get('user-agent') || '',
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[security-analysis] telemetry', e);
    res.status(500).json({ message: 'Telemetry failed' });
  }
});

router.use(authenticate, authorize('admin'));

router.get('/overview', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(await getSecurityOverview());
  } catch (e) {
    console.error('[security-analysis] overview', e);
    res.status(500).json({ message: 'Failed to load security overview' });
  }
});

router.get('/vulnerabilities', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ findings: await getSecurityFindings() });
  } catch (e) {
    console.error('[security-analysis] vulnerabilities', e);
    res.status(500).json({ findings: [], message: 'Failed to load findings' });
  }
});

router.get('/surface', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(await getAttackSurface());
  } catch (e) {
    console.error('[security-analysis] surface', e);
    res.status(500).json({ nodes: [], message: 'Failed to load surface' });
  }
});

router.get('/events', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ events: await getSecurityEvents() });
  } catch (e) {
    console.error('[security-analysis] events', e);
    res.status(500).json({ events: [], message: 'Failed to load events' });
  }
});

router.get('/compliance', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json({ items: await getComplianceOwasp() });
  } catch (e) {
    console.error('[security-analysis] compliance', e);
    res.status(500).json({ items: [], message: 'Failed to load compliance' });
  }
});

router.post('/scan/run', (req: AuthenticatedRequest, res: Response) => {
  const mode = req.body?.mode === 'deep' ? 'deep' : req.body?.mode === 'quick' ? 'quick' : 'standard';
  res.json(runSecurityScan(mode));
});

router.get('/auth-activity', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ events: getAuthSecurityEvents(), behavior: getUserSellerBehavior() });
});

router.get('/intelligence', (_req: AuthenticatedRequest, res: Response) => {
  try {
    res.json(getIntelligenceSnapshot());
  } catch (e) {
    console.error('[security-analysis] intelligence', e);
    res.status(500).json({ message: 'Failed to load intelligence' });
  }
});

router.post('/audit/session-viewer', (req: AuthenticatedRequest, res: Response) => {
  try {
    const target = (req.body as { targetUserId?: string })?.targetUserId;
    if (!req.user?.id || typeof target !== 'string' || !target.trim()) {
      res.status(400).json({ message: 'targetUserId required' });
      return;
    }
    logAdminSessionViewerAccess(String(req.user.id), target.trim());
    res.json({ ok: true });
  } catch (e) {
    console.error('[security-analysis] audit', e);
    res.status(500).json({ message: 'Audit log failed' });
  }
});

export default router;
