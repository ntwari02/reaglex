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

const router = Router();

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

export default router;
