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

router.get('/overview', (_req: AuthenticatedRequest, res: Response) => {
  res.json(getSecurityOverview());
});

router.get('/vulnerabilities', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ findings: getSecurityFindings() });
});

router.get('/surface', (_req: AuthenticatedRequest, res: Response) => {
  res.json(getAttackSurface());
});

router.get('/events', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ events: getSecurityEvents() });
});

router.get('/compliance', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ items: getComplianceOwasp() });
});

router.post('/scan/run', (req: AuthenticatedRequest, res: Response) => {
  const mode = req.body?.mode === 'deep' ? 'deep' : req.body?.mode === 'quick' ? 'quick' : 'standard';
  res.json(runSecurityScan(mode));
});

router.get('/auth-activity', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ events: getAuthSecurityEvents(), behavior: getUserSellerBehavior() });
});

export default router;
