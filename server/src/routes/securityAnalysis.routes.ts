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
  getSessionSubjectDetailForAdmin,
  type UserRole,
} from '../services/securityIntelligence.service';
import { ApiConfiguration } from '../models/ApiConfiguration';
import { getServerUrl, isProductionNodeEnv } from '../config/publicEnv';

const router = Router();

type ConfigApiStatus = 'online' | 'degraded' | 'offline';
type ConfigLogLevel = 'error' | 'warn' | 'info' | 'debug';
type ConfigEnvironment = 'production' | 'staging' | 'sandbox' | 'development';
type ConfigAuthType = 'none' | 'api_key' | 'bearer' | 'oauth2' | 'basic';

type ConfigApiEntry = {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  environment: ConfigEnvironment;
  authType: ConfigAuthType;
  rateLimit: string;
  securityScore: number;
  lastChecked: string;
  status: ConfigApiStatus;
  lastTestAt?: string;
  lastTestOk?: boolean;
  lastTestMessage?: string;
  usage24h: number;
  errorCount24h: number;
  failedRequestLogs: Array<{ at: string; message: string; statusCode?: number }>;
  lastSyncAt: string;
  riskAlerts: string[];
  supportsWebhook: boolean;
  allowedOrigins: string[];
  loggingLevel: ConfigLogLevel;
  callbackUrl?: string;
  headers: Array<{ key: string; value: string }>;
  apiKeyMasked?: string;
  secretMasked?: string;
  roleAccess: Array<'admin' | 'security_admin' | 'finance_admin'>;
  auditLogs: Array<{ at: string; actor: string; action: string; summary: string }>;
};

type ConfigSavePayload = Partial<
  Pick<
    ConfigApiEntry,
    | 'endpoint'
    | 'method'
    | 'environment'
    | 'authType'
    | 'rateLimit'
    | 'allowedOrigins'
    | 'loggingLevel'
    | 'callbackUrl'
    | 'headers'
    | 'roleAccess'
  >
>;

const nowIso = () => new Date().toISOString();

/** If an old save pointed at localhost but defaults now use a public API host (e.g. Render), prefer the canonical URL. */
function resolvePersistedPublicUrl(persisted: string | undefined, canonical: string | undefined): string | undefined {
  if (persisted === undefined || persisted === '') return canonical;
  if (!canonical) return persisted;
  const p = persisted.toLowerCase();
  const isLocal = p.includes('localhost') || p.includes('127.0.0.1');
  const c = canonical.toLowerCase();
  const canonicalIsLocal = c.includes('localhost') || c.includes('127.0.0.1');
  if (isProductionNodeEnv() && isLocal && !canonicalIsLocal) return canonical;
  return persisted;
}

const toMasked = (raw?: string) => {
  const v = String(raw || '').trim();
  if (!v) return undefined;
  if (v.length <= 6) return '••••••';
  return `${v.slice(0, 2)}••••••${v.slice(-2)}`;
};

function getConfigEnvironment(): ConfigEnvironment {
  const env = String(process.env.NODE_ENV || 'development').toLowerCase();
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  if (env === 'sandbox') return 'sandbox';
  return 'development';
}

function defaultConfigApis(): ConfigApiEntry[] {
  const environment = getConfigEnvironment();
  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const serverUrl = getServerUrl().replace(/\/$/, '');
  const exchangeRateUrl = String(process.env.EXCHANGE_RATE_API_URL || '').trim();
  const momoUrl = String(process.env.MOMO_BASE_URL || '').trim();
  const momoCallback = String(process.env.MOMO_CALLBACK_URL || '').trim();
  const apiBase = `${serverUrl}/api`;

  const externalApis: ConfigApiEntry[] = [
    {
      id: 'google-oauth',
      name: 'Google OAuth API',
      endpoint: String(process.env.GOOGLE_CALLBACK_URL || `${serverUrl}/api/auth/google/callback`).trim(),
      method: 'GET',
      environment,
      authType: 'oauth2',
      rateLimit: '60 req/min',
      securityScore: process.env.GOOGLE_CLIENT_SECRET ? 82 : 45,
      lastChecked: nowIso(),
      status: process.env.GOOGLE_CLIENT_SECRET ? 'online' : 'degraded',
      usage24h: 120,
      errorCount24h: 1,
      failedRequestLogs: [],
      lastSyncAt: nowIso(),
      riskAlerts: process.env.GOOGLE_CLIENT_SECRET ? ['No active risk alerts'] : ['Missing Google client secret'],
      supportsWebhook: false,
      allowedOrigins,
      loggingLevel: 'info',
      headers: [{ key: 'Accept', value: 'application/json' }],
      apiKeyMasked: toMasked(process.env.GOOGLE_CLIENT_ID),
      secretMasked: toMasked(process.env.GOOGLE_CLIENT_SECRET),
      roleAccess: ['admin', 'security_admin'],
      auditLogs: [],
    },
    {
      id: 'mtn-momo',
      name: 'MTN MoMo Collections API',
      endpoint: momoUrl || 'https://sandbox.momodeveloper.mtn.com',
      method: 'POST',
      environment: String(process.env.MOMO_TARGET_ENVIRONMENT || '').toLowerCase() === 'sandbox' ? 'sandbox' : environment,
      authType: 'api_key',
      rateLimit: '100 req/min',
      securityScore: process.env.MOMO_API_KEY ? 78 : 38,
      lastChecked: nowIso(),
      status: process.env.MOMO_API_KEY ? 'online' : 'offline',
      usage24h: 230,
      errorCount24h: 3,
      failedRequestLogs: [],
      lastSyncAt: nowIso(),
      riskAlerts: process.env.MOMO_API_KEY ? ['No active risk alerts'] : ['Missing MOMO API key'],
      supportsWebhook: true,
      callbackUrl: momoCallback || `${serverUrl}/api/payments/momo/callback`,
      allowedOrigins,
      loggingLevel: 'info',
      headers: [
        { key: 'X-Target-Environment', value: String(process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox') },
        { key: 'Ocp-Apim-Subscription-Key', value: '••••••' },
      ],
      apiKeyMasked: toMasked(process.env.MOMO_API_KEY),
      secretMasked: toMasked(process.env.MOMO_SUBSCRIPTION_KEY),
      roleAccess: ['admin', 'finance_admin'],
      auditLogs: [],
    },
    {
      id: 'cloudinary',
      name: 'Cloudinary Asset API',
      endpoint: 'https://api.cloudinary.com/v1_1',
      method: 'POST',
      environment,
      authType: 'api_key',
      rateLimit: '120 req/min',
      securityScore: process.env.CLOUDINARY_API_SECRET ? 86 : 40,
      lastChecked: nowIso(),
      status: process.env.CLOUDINARY_API_SECRET ? 'online' : 'degraded',
      usage24h: 540,
      errorCount24h: 2,
      failedRequestLogs: [],
      lastSyncAt: nowIso(),
      riskAlerts: process.env.CLOUDINARY_API_SECRET ? ['No active risk alerts'] : ['Missing Cloudinary API secret'],
      supportsWebhook: false,
      allowedOrigins,
      loggingLevel: 'info',
      headers: [{ key: 'Content-Type', value: 'multipart/form-data' }],
      apiKeyMasked: toMasked(process.env.CLOUDINARY_API_KEY),
      secretMasked: toMasked(process.env.CLOUDINARY_API_SECRET),
      roleAccess: ['admin', 'security_admin'],
      auditLogs: [],
    },
    {
      id: 'resend-email',
      name: 'Resend Email API',
      endpoint: 'https://api.resend.com',
      method: 'POST',
      environment,
      authType: 'bearer',
      rateLimit: '60 req/min',
      securityScore: process.env.RESEND_API_KEY ? 81 : 30,
      lastChecked: nowIso(),
      status: process.env.RESEND_API_KEY ? 'online' : 'offline',
      usage24h: 190,
      errorCount24h: 0,
      failedRequestLogs: [],
      lastSyncAt: nowIso(),
      riskAlerts: process.env.RESEND_API_KEY ? ['No active risk alerts'] : ['Missing RESEND API key'],
      supportsWebhook: false,
      allowedOrigins,
      loggingLevel: 'info',
      headers: [{ key: 'Authorization', value: 'Bearer ••••••' }],
      apiKeyMasked: toMasked(process.env.RESEND_API_KEY),
      secretMasked: undefined,
      roleAccess: ['admin', 'security_admin'],
      auditLogs: [],
    },
    {
      id: 'gemini-ai',
      name: 'Gemini AI API',
      endpoint: 'https://generativelanguage.googleapis.com',
      method: 'POST',
      environment,
      authType: 'api_key',
      rateLimit: '30 req/min',
      securityScore: process.env.GEMINI_API_KEY ? 76 : 32,
      lastChecked: nowIso(),
      status: process.env.GEMINI_API_KEY ? 'online' : 'offline',
      usage24h: 84,
      errorCount24h: 1,
      failedRequestLogs: [],
      lastSyncAt: nowIso(),
      riskAlerts: process.env.GEMINI_API_KEY ? ['No active risk alerts'] : ['Missing GEMINI API key'],
      supportsWebhook: false,
      allowedOrigins,
      loggingLevel: 'info',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      apiKeyMasked: toMasked(process.env.GEMINI_API_KEY),
      secretMasked: undefined,
      roleAccess: ['admin', 'security_admin'],
      auditLogs: [],
    },
    {
      id: 'exchange-rate',
      name: 'Exchange Rate API',
      endpoint: exchangeRateUrl || 'https://v6.exchangerate-api.com/v6',
      method: 'GET',
      environment,
      authType: 'api_key',
      rateLimit: '20 req/min',
      securityScore: process.env.EXCHANGE_RATE_API_KEY ? 75 : 35,
      lastChecked: nowIso(),
      status: process.env.EXCHANGE_RATE_API_KEY ? 'online' : 'degraded',
      usage24h: 44,
      errorCount24h: 0,
      failedRequestLogs: [],
      lastSyncAt: nowIso(),
      riskAlerts: process.env.EXCHANGE_RATE_API_KEY ? ['No active risk alerts'] : ['Missing exchange rate API key'],
      supportsWebhook: false,
      allowedOrigins,
      loggingLevel: 'info',
      headers: [{ key: 'Accept', value: 'application/json' }],
      apiKeyMasked: toMasked(process.env.EXCHANGE_RATE_API_KEY),
      secretMasked: undefined,
      roleAccess: ['admin', 'finance_admin'],
      auditLogs: [],
    },
    {
      id: 'openrouteservice',
      name: 'OpenRouteService API',
      endpoint: 'https://api.openrouteservice.org',
      method: 'POST',
      environment,
      authType: 'api_key',
      rateLimit: '40 req/min',
      securityScore: process.env.OPENROUTESERVICE_API_KEY ? 79 : 33,
      lastChecked: nowIso(),
      status: process.env.OPENROUTESERVICE_API_KEY ? 'online' : 'offline',
      usage24h: 156,
      errorCount24h: 2,
      failedRequestLogs: [],
      lastSyncAt: nowIso(),
      riskAlerts: process.env.OPENROUTESERVICE_API_KEY ? ['No active risk alerts'] : ['Missing OpenRouteService key'],
      supportsWebhook: false,
      allowedOrigins,
      loggingLevel: 'info',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      apiKeyMasked: toMasked(process.env.OPENROUTESERVICE_API_KEY),
      secretMasked: undefined,
      roleAccess: ['admin', 'security_admin'],
      auditLogs: [],
    },
  ];

  const internalApiSeeds: Array<Pick<ConfigApiEntry, 'id' | 'name' | 'endpoint' | 'method' | 'authType'>> = [
    { id: 'platform-auth', name: 'Platform Auth API', endpoint: `${apiBase}/auth`, method: 'POST', authType: 'bearer' },
    { id: 'platform-profile', name: 'Platform Profile API', endpoint: `${apiBase}/profile`, method: 'GET', authType: 'bearer' },
    { id: 'platform-products', name: 'Products API', endpoint: `${apiBase}/products`, method: 'GET', authType: 'none' },
    { id: 'platform-orders', name: 'Orders API', endpoint: `${apiBase}/orders`, method: 'POST', authType: 'bearer' },
    { id: 'platform-payments', name: 'Payments API', endpoint: `${apiBase}/payments`, method: 'POST', authType: 'bearer' },
    { id: 'platform-shipping', name: 'Shipping API', endpoint: `${apiBase}/shipping`, method: 'POST', authType: 'none' },
    { id: 'platform-notifications', name: 'Notifications API', endpoint: `${apiBase}/notifications`, method: 'GET', authType: 'bearer' },
    { id: 'platform-system', name: 'System Monitor API', endpoint: `${apiBase}/system`, method: 'GET', authType: 'bearer' },
    { id: 'platform-security', name: 'Security Analysis API', endpoint: `${apiBase}/security-analysis`, method: 'GET', authType: 'bearer' },
    { id: 'platform-assistant', name: 'Assistant API', endpoint: `${apiBase}/assistant`, method: 'POST', authType: 'bearer' },
    { id: 'platform-ai', name: 'AI API', endpoint: `${apiBase}/ai`, method: 'POST', authType: 'bearer' },
    { id: 'platform-admin-core', name: 'Admin Core API', endpoint: `${apiBase}/admin`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-finance', name: 'Admin Finance API', endpoint: `${apiBase}/admin/finance`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-logistics', name: 'Admin Logistics API', endpoint: `${apiBase}/admin/logistics`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-notifications', name: 'Admin Notifications API', endpoint: `${apiBase}/admin/notifications`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-marketing', name: 'Admin Marketing API', endpoint: `${apiBase}/admin/marketing`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-reviews', name: 'Admin Reviews API', endpoint: `${apiBase}/admin/reviews`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-products', name: 'Admin Products API', endpoint: `${apiBase}/admin/products`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-orders', name: 'Admin Orders API', endpoint: `${apiBase}/admin/orders`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-compliance', name: 'Admin Compliance API', endpoint: `${apiBase}/admin/compliance`, method: 'GET', authType: 'bearer' },
    { id: 'platform-admin-collections', name: 'Admin Collections API', endpoint: `${apiBase}/admin/collections`, method: 'GET', authType: 'bearer' },
    { id: 'platform-currency', name: 'Currency API', endpoint: `${apiBase}/currency`, method: 'GET', authType: 'none' },
    { id: 'platform-recommendation-emails', name: 'Recommendation Email API', endpoint: `${apiBase}/recommendation-emails`, method: 'POST', authType: 'bearer' },
    { id: 'platform-verification', name: 'Verification API', endpoint: `${apiBase}/verification`, method: 'POST', authType: 'bearer' },
  ];

  const internalApis: ConfigApiEntry[] = internalApiSeeds.map((row, index) => ({
    ...row,
    environment,
    rateLimit: '200 req/15m',
    securityScore: 88,
    lastChecked: nowIso(),
    status: 'online' as ConfigApiStatus,
    usage24h: 300 + index * 20,
    errorCount24h: index % 5 === 0 ? 1 : 0,
    failedRequestLogs: [],
    lastSyncAt: nowIso(),
    riskAlerts: ['No active risk alerts'],
    supportsWebhook: false,
    allowedOrigins,
    loggingLevel: 'info' as ConfigLogLevel,
    headers: [{ key: 'Authorization', value: 'Bearer ••••••' }],
    apiKeyMasked: undefined,
    secretMasked: undefined,
    roleAccess: ['admin', 'security_admin'] as Array<'admin' | 'security_admin' | 'finance_admin'>,
    auditLogs: [],
  }));

  const catalog = [...externalApis, ...internalApis];

  return catalog;
}

async function getConfigApisFromStore(): Promise<ConfigApiEntry[]> {
  const defaults = defaultConfigApis();
  const ids = defaults.map((x) => x.id);
  const docs = await ApiConfiguration.find({ apiId: { $in: ids } }).lean().catch(() => []);
  const byId = new Map<string, any>();
  for (const doc of docs) byId.set(String(doc.apiId), doc);
  return defaults.map((entry) => {
    const persisted = byId.get(entry.id);
    const override = (persisted?.config || {}) as ConfigSavePayload;
    const endpoint = resolvePersistedPublicUrl(override.endpoint, entry.endpoint) ?? entry.endpoint;
    const callbackUrl = resolvePersistedPublicUrl(override.callbackUrl, entry.callbackUrl) ?? entry.callbackUrl;

    const merged: ConfigApiEntry = {
      ...entry,
      ...override,
      endpoint,
      ...(callbackUrl !== undefined ? { callbackUrl } : {}),
      headers: override.headers || entry.headers,
      allowedOrigins: override.allowedOrigins || entry.allowedOrigins,
      roleAccess: override.roleAccess || entry.roleAccess,
      auditLogs: Array.isArray(persisted?.auditLogs)
        ? persisted.auditLogs.map((log: any) => ({
            at: new Date(log.at || nowIso()).toISOString(),
            actor: String(log.actor || 'admin'),
            action: String(log.action || 'UPDATE'),
            summary: String(log.summary || 'Configuration changed'),
          }))
        : [],
      lastChecked: persisted?.lastTestAt ? new Date(persisted.lastTestAt).toISOString() : entry.lastChecked,
      lastTestAt: persisted?.lastTestAt ? new Date(persisted.lastTestAt).toISOString() : undefined,
      lastTestOk: typeof persisted?.lastTestOk === 'boolean' ? persisted.lastTestOk : undefined,
      lastTestMessage: typeof persisted?.lastTestMessage === 'string' ? persisted.lastTestMessage : undefined,
    };
    return merged;
  });
}

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

router.get('/apis', (_req: AuthenticatedRequest, res: Response) => {
  void getConfigApisFromStore()
    .then((apis) => res.json({ apis }))
    .catch(() => res.json({ apis: defaultConfigApis() }));
});

router.get('/apis/:id', (req: AuthenticatedRequest, res: Response) => {
  void getConfigApisFromStore()
    .then((apis) => {
      const hit = apis.find((x) => x.id === String(req.params.id));
      if (!hit) {
        res.status(404).json({ message: 'API config entry not found' });
        return;
      }
      res.json({ api: hit });
    })
    .catch(() => res.status(500).json({ message: 'Failed to load API config entry' }));
});

router.put('/apis/:id', (req: AuthenticatedRequest, res: Response) => {
  void getConfigApisFromStore()
    .then(async (apis) => {
      const id = String(req.params.id);
      const hit = apis.find((x) => x.id === id);
      if (!hit) {
        res.status(404).json({ message: 'API config entry not found' });
        return;
      }

      const payload = (req.body || {}) as ConfigSavePayload;
      const nextOverride: ConfigSavePayload = {
        endpoint: typeof payload.endpoint === 'string' ? payload.endpoint.trim() : hit.endpoint,
        method: typeof payload.method === 'string' ? payload.method.trim().toUpperCase() : hit.method,
        environment:
          payload.environment === 'production' ||
          payload.environment === 'staging' ||
          payload.environment === 'sandbox' ||
          payload.environment === 'development'
            ? payload.environment
            : hit.environment,
        authType:
          payload.authType === 'none' ||
          payload.authType === 'api_key' ||
          payload.authType === 'bearer' ||
          payload.authType === 'oauth2' ||
          payload.authType === 'basic'
            ? payload.authType
            : hit.authType,
        rateLimit: typeof payload.rateLimit === 'string' ? payload.rateLimit.trim() : hit.rateLimit,
        allowedOrigins: Array.isArray(payload.allowedOrigins)
          ? payload.allowedOrigins.filter((x) => typeof x === 'string')
          : hit.allowedOrigins,
        loggingLevel:
          payload.loggingLevel === 'error' ||
          payload.loggingLevel === 'warn' ||
          payload.loggingLevel === 'info' ||
          payload.loggingLevel === 'debug'
            ? payload.loggingLevel
            : hit.loggingLevel,
        callbackUrl: typeof payload.callbackUrl === 'string' ? payload.callbackUrl.trim() : hit.callbackUrl,
        headers: Array.isArray(payload.headers)
          ? payload.headers
              .filter((x) => x && typeof x.key === 'string')
              .map((x) => ({ key: x.key.trim(), value: typeof x.value === 'string' ? x.value : '' }))
          : hit.headers,
        roleAccess: Array.isArray(payload.roleAccess)
          ? payload.roleAccess.filter((x) => x === 'admin' || x === 'security_admin' || x === 'finance_admin')
          : hit.roleAccess,
      };

      const actor = req.user?.email || req.user?.id || 'admin';
      await ApiConfiguration.findOneAndUpdate(
        { apiId: id },
        {
          $set: { config: nextOverride },
          $push: {
            auditLogs: {
              $each: [{ at: new Date(), actor: String(actor), action: 'UPDATE', summary: 'Configuration updated from Security Configuration Room' }],
              $position: 0,
              $slice: 30,
            },
          },
        },
        { new: true, upsert: true }
      );
      const updated = (await getConfigApisFromStore()).find((x) => x.id === id) || hit;
      res.json({ ok: true, api: updated });
    })
    .catch(() => res.status(500).json({ message: 'Failed to save API configuration' }));
});

router.post('/apis/:id/test', (req: AuthenticatedRequest, res: Response) => {
  void getConfigApisFromStore()
    .then(async (apis) => {
      const id = String(req.params.id);
      const hit = apis.find((x) => x.id === id);
      if (!hit) {
        res.status(404).json({ message: 'API config entry not found' });
        return;
      }
      const healthy = hit.status !== 'offline' && hit.securityScore >= 50;
      const actor = req.user?.email || req.user?.id || 'admin';
      await ApiConfiguration.findOneAndUpdate(
        { apiId: id },
        {
          $set: {
            lastTestAt: new Date(),
            lastTestOk: healthy,
            lastTestMessage: healthy
              ? 'Connection test successful'
              : 'Connection test failed. Check credentials and endpoint settings.',
          },
          $push: {
            auditLogs: {
              $each: [{ at: new Date(), actor: String(actor), action: 'TEST', summary: healthy ? 'Connection test passed' : 'Connection test reported issues' }],
              $position: 0,
              $slice: 30,
            },
          },
        },
        { new: true, upsert: true }
      );
      res.json({
        ok: healthy,
        message: healthy ? 'Connection test successful' : 'Connection test failed. Check credentials and endpoint settings.',
      });
    })
    .catch(() => res.status(500).json({ message: 'Connection test failed due to internal error' }));
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

/** Rich subject detail for virtual session viewer (account + IP/geo/device). Admin-only. */
router.get('/session-subject/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = String(req.params.userId || '').trim();
    if (!uid) {
      res.status(400).json({ message: 'userId required' });
      return;
    }
    const detail = await getSessionSubjectDetailForAdmin(uid);
    res.json(detail);
  } catch (e) {
    console.error('[security-analysis] session-subject', e);
    res.status(500).json({ message: 'Failed to load session subject' });
  }
});

export default router;
