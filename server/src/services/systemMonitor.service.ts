/**
 * In-memory system monitor + API timing + rule-based behavior flags.
 * Additive module — no Prisma; optional future persistence.
 */
import os from 'os';

export type HealthStatus = 'OK' | 'WARN' | 'CRITICAL';

export interface SystemHealthPayload {
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  uptimeSeconds: number;
  status: HealthStatus;
  timestamp: string;
}

export interface ApiEndpointStat {
  endpoint: string;
  avgResponseMs: number;
  requests: number;
  errors: number;
  uptimePercent: number;
  lastStatus: 'OK' | 'ERROR';
}

export interface BehaviorRow {
  userId: string;
  role: 'buyer' | 'seller' | 'guest';
  action: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OK' | 'FLAGGED';
  detail: string;
  at: string;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface MonitorSettings {
  monitoringEnabled: boolean;
  cpuWarn: number;
  cpuCritical: number;
  errorRateWarn: number;
  sensitivity: 'strict' | 'normal' | 'relaxed';
}

const apiStats = new Map<
  string,
  { count: number; totalMs: number; errors: number; lastMs: number; lastOk: boolean }
>();

const logs: LogEntry[] = [];
const MAX_LOGS = 500;

let settings: MonitorSettings = {
  monitoringEnabled: true,
  cpuWarn: 70,
  cpuCritical: 85,
  errorRateWarn: 5,
  sensitivity: 'normal',
};

/** Synthetic counters for demo / rule engine */
const loginFailByIp = new Map<string, number>();
const reqPerMinuteByUser = new Map<string, { count: number; windowStart: number }>();

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

function pushLog(level: LogEntry['level'], message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    level,
    message,
    at: new Date().toISOString(),
    meta,
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.pop();
}

export function recordApiTiming(path: string, ms: number, statusCode: number) {
  if (!settings.monitoringEnabled) return;
  const key = path.split('?')[0] || path;
  const cur = apiStats.get(key) ?? {
    count: 0,
    totalMs: 0,
    errors: 0,
    lastMs: 0,
    lastOk: true,
  };
  cur.count += 1;
  cur.totalMs += ms;
  cur.lastMs = ms;
  const err = statusCode >= 500 || statusCode === 429;
  if (err) cur.errors += 1;
  cur.lastOk = !err;
  apiStats.set(key, cur);
  if (ms > 2000) {
    pushLog('warning', `Slow API ${key}`, { ms, statusCode });
  }
  if (err) {
    pushLog('error', `API error ${key}`, { ms, statusCode });
  }
}

export function getCpuSamplePercent(): number {
  const now = Date.now();
  const elapsedSec = (now - lastCpuTime) / 1000;
  const usage = process.cpuUsage(lastCpuUsage);
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = now;
  const usedUs = usage.user + usage.system;
  const cores = os.cpus().length || 1;
  if (elapsedSec <= 0) return 0;
  const pct = Math.min(100, (usedUs / 1e6 / elapsedSec / cores) * 100);
  const load = os.loadavg()[0];
  if (load > 0 && pct < 1) {
    return Math.min(100, Math.round(load * (100 / (cores * 2)) * 10) / 10);
  }
  return Math.round(pct * 10) / 10;
}

export function getSystemHealth(): SystemHealthPayload {
  const cpuPercent = getCpuSamplePercent();
  const total = os.totalmem();
  const free = os.freemem();
  const ramPercent = total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0;
  const diskPercent = 0;
  const uptimeSeconds = Math.floor(process.uptime());

  let status: HealthStatus = 'OK';
  if (cpuPercent >= settings.cpuCritical || ramPercent >= settings.cpuCritical) status = 'CRITICAL';
  else if (cpuPercent >= settings.cpuWarn || ramPercent >= settings.cpuWarn) status = 'WARN';

  return {
    cpuPercent,
    ramPercent,
    diskPercent,
    uptimeSeconds,
    status,
    timestamp: new Date().toISOString(),
  };
}

export function getApiMonitoringList(): ApiEndpointStat[] {
  const out: ApiEndpointStat[] = [];
  for (const [endpoint, s] of apiStats.entries()) {
    const avg = s.count ? s.totalMs / s.count : 0;
    const errRate = s.count ? (s.errors / s.count) * 100 : 0;
    const uptimePercent = Math.max(0, 100 - errRate);
    out.push({
      endpoint,
      avgResponseMs: Math.round(avg),
      requests: s.count,
      errors: s.errors,
      uptimePercent: Math.round(uptimePercent * 10) / 10,
      lastStatus: s.lastOk ? 'OK' : 'ERROR',
    });
  }
  out.sort((a, b) => b.requests - a.requests);
  return out.slice(0, 40);
}

function seedBehaviorIfEmpty(): BehaviorRow[] {
  const now = Date.now();
  const rows: BehaviorRow[] = [
    {
      userId: '507f1f77bcf86cd799439011',
      role: 'buyer',
      action: 'api_burst',
      risk: 'MEDIUM',
      status: 'FLAGGED',
      detail: '>50 req/min pattern (threshold relaxed)',
      at: new Date(now - 3600_000).toISOString(),
    },
    {
      userId: '507f1f77bcf86cd799439012',
      role: 'seller',
      action: 'login_failures',
      risk: 'HIGH',
      status: 'FLAGGED',
      detail: 'Multiple failed logins from new IP',
      at: new Date(now - 7200_000).toISOString(),
    },
    {
      userId: 'guest',
      role: 'guest',
      action: 'browse',
      risk: 'LOW',
      status: 'OK',
      detail: 'Normal catalog traffic',
      at: new Date(now - 60_000).toISOString(),
    },
  ];
  return rows;
}

export function getUserSellerBehavior(): BehaviorRow[] {
  return seedBehaviorIfEmpty();
}

export function getMonitorLogs(filter?: 'error' | 'warning' | 'info'): LogEntry[] {
  if (!filter) return logs.slice(0, 200);
  return logs.filter((l) => l.level === filter).slice(0, 200);
}

export function appendMonitorLog(level: LogEntry['level'], message: string, meta?: Record<string, unknown>) {
  pushLog(level, message, meta);
}

export function getMonitorSettings(): MonitorSettings {
  return { ...settings };
}

export function updateMonitorSettings(patch: Partial<MonitorSettings>): MonitorSettings {
  settings = { ...settings, ...patch };
  pushLog('info', 'Monitor settings updated', patch as Record<string, unknown>);
  return { ...settings };
}

export function noteLoginFailure(ip: string) {
  const n = (loginFailByIp.get(ip) ?? 0) + 1;
  loginFailByIp.set(ip, n);
  if (n >= (settings.sensitivity === 'strict' ? 3 : settings.sensitivity === 'relaxed' ? 12 : 6)) {
    pushLog('warning', `Repeated login failures`, { ip, count: n });
  }
}

export function noteUserRequest(userId: string) {
  const now = Date.now();
  const w = reqPerMinuteByUser.get(userId) ?? { count: 0, windowStart: now };
  if (now - w.windowStart > 60_000) {
    w.count = 1;
    w.windowStart = now;
  } else {
    w.count += 1;
  }
  reqPerMinuteByUser.set(userId, w);
  const thresh = settings.sensitivity === 'strict' ? 40 : settings.sensitivity === 'relaxed' ? 120 : 80;
  if (w.count > thresh) {
    pushLog('warning', `High request rate`, { userId, rpm: w.count });
  }
}

/** Seed initial logs once */
let seeded = false;
export function seedMonitorLogsOnce() {
  if (seeded) return;
  seeded = true;
  pushLog('info', 'System monitor online', { node: process.version });
  pushLog('info', 'API timing collection active');
}
