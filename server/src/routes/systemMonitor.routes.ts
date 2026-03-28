import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import {
  getSystemHealth,
  getApiMonitoringList,
  getUserSellerBehavior,
  getMonitorLogs,
  getMonitorSettings,
  updateMonitorSettings,
  seedMonitorLogsOnce,
} from '../services/systemMonitor.service';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/health', (_req: AuthenticatedRequest, res: Response) => {
  seedMonitorLogsOnce();
  res.json(getSystemHealth());
});

router.get('/apis', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ endpoints: getApiMonitoringList() });
});

router.get('/users/behavior', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ rows: getUserSellerBehavior() });
});

router.get('/logs', (req: AuthenticatedRequest, res: Response) => {
  const level = req.query.level as 'error' | 'warning' | 'info' | undefined;
  res.json({ logs: getMonitorLogs(level) });
});

router.post('/settings', (req: AuthenticatedRequest, res: Response) => {
  const body = req.body ?? {};
  const next = updateMonitorSettings({
    monitoringEnabled:
      typeof body.monitoringEnabled === 'boolean' ? body.monitoringEnabled : undefined,
    cpuWarn: typeof body.cpuWarn === 'number' ? body.cpuWarn : undefined,
    cpuCritical: typeof body.cpuCritical === 'number' ? body.cpuCritical : undefined,
    errorRateWarn: typeof body.errorRateWarn === 'number' ? body.errorRateWarn : undefined,
    sensitivity: ['strict', 'normal', 'relaxed'].includes(body.sensitivity)
      ? body.sensitivity
      : undefined,
  });
  res.json({ settings: next });
});

router.get('/settings', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ settings: getMonitorSettings() });
});

export default router;
