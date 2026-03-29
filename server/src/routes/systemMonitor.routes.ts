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
  getActivityStream,
  getAlerts,
  getGlobalStatus,
  getUptimeBuckets24h,
  getUptimeBuckets7d,
  getTerminalBuffers,
  executeTerminalAction,
  type TerminalActionId,
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

router.get('/activity', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ activity: getActivityStream(100) });
});

router.get('/alerts', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ alerts: getAlerts() });
});

router.get('/status', (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    global: getGlobalStatus(),
    buckets24h: getUptimeBuckets24h(),
    buckets7d: getUptimeBuckets7d(),
  });
});

router.get('/terminal', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ buffers: getTerminalBuffers() });
});

router.post('/terminal/action', (req: AuthenticatedRequest, res: Response) => {
  const cardId = String(req.body?.cardId || 'perf');
  const action = String(req.body?.action || '') as TerminalActionId;
  const confirm = req.body?.confirm === true;
  const allowed: TerminalActionId[] = [
    'simulate_fix_deps',
    'simulate_restart_monitor',
    'simulate_audit_packages',
    'simulate_clear_cache',
  ];
  if (!allowed.includes(action)) {
    return res.status(400).json({ ok: false, message: 'Invalid action' });
  }
  const result = executeTerminalAction(cardId, action, confirm);
  return res.json(result);
});

router.get('/bundle', (_req: AuthenticatedRequest, res: Response) => {
  seedMonitorLogsOnce();
  const health = getSystemHealth();
  const endpoints = getApiMonitoringList();
  res.json({
    health,
    endpoints,
    activity: getActivityStream(60),
    alerts: getAlerts(),
    status: getGlobalStatus(),
    buckets24h: getUptimeBuckets24h(),
    terminals: getTerminalBuffers(),
    logs: getMonitorLogs().slice(0, 40),
  });
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
    ramWarn: typeof body.ramWarn === 'number' ? body.ramWarn : undefined,
    ramCritical: typeof body.ramCritical === 'number' ? body.ramCritical : undefined,
    diskWarn: typeof body.diskWarn === 'number' ? body.diskWarn : undefined,
    diskCritical: typeof body.diskCritical === 'number' ? body.diskCritical : undefined,
    errorRateWarn: typeof body.errorRateWarn === 'number' ? body.errorRateWarn : undefined,
    apiSlowWarnMs: typeof body.apiSlowWarnMs === 'number' ? body.apiSlowWarnMs : undefined,
    apiSlowCriticalMs: typeof body.apiSlowCriticalMs === 'number' ? body.apiSlowCriticalMs : undefined,
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
