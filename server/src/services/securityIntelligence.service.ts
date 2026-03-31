/**
 * In-memory security intelligence: live sessions, risk, activity feed, alerts.
 * Privacy: no passwords; emails masked in API responses.
 */
import { EventEmitter } from 'node:events';
import { getConnectedUsersByRole } from './socketRegistry';

export type UserRole = 'buyer' | 'seller' | 'admin' | 'guest';

export interface SecurityActivityEvent {
  id: string;
  at: string;
  role: UserRole;
  userId?: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'auth'
    | 'navigation'
    | 'commerce'
    | 'admin'
    | 'suspicious'
    | 'system'
    | 'session';
  title: string;
  detail: string;
  meta?: Record<string, unknown>;
}

export interface VirtualSessionGhost {
  userId: string;
  role: UserRole;
  currentRoute: string;
  routeLabel: string;
  lastActions: Array<{ at: string; type: string; detail: string }>;
  reconstructedUi: { title: string; sections: string[]; hints: string[] };
  maskedIdentifier: string;
  deviceHint: string;
  sessionStartedAt: string;
  lastSeenAt: string;
  riskScore: number;
  riskBand: 'safe' | 'suspicious' | 'dangerous';
}

export interface RoleLiveCard {
  role: 'buyer' | 'seller' | 'admin';
  onlineCount: number;
  activeSessions: number;
  currentActions: string[];
  riskIndicator: 'low' | 'medium' | 'high';
  avgSessionDurationSec: number;
  topIpsSample: string[];
}

export interface SecurityAlertRow {
  id: string;
  at: string;
  userId?: string;
  role?: UserRole;
  title: string;
  detail: string;
  riskScore: number;
  channels: { email: boolean; sms: boolean; inapp: boolean };
}

export interface WeeklySecurityStats {
  days: Array<{ date: string; events: number; highSeverity: number }>;
  topRiskyUsers: Array<{ userId: string; role: UserRole; score: number; events: number }>;
  blockedOrFlagged: number;
  peakSuspiciousHourUtc: number | null;
}

const MAX_EVENTS = 400;
const MAX_ALERTS = 120;
const SESSION_ACTIONS = 24;

export const securityIntelBus = new EventEmitter();

const activityRing: SecurityActivityEvent[] = [];
const alertHistory: SecurityAlertRow[] = [];
const sessionMap = new Map<string, VirtualSessionGhost>();
const riskByUser = new Map<string, number>();
const dailyBuckets = new Map<string, { events: number; high: number }>();
const lastTelemetryAt = new Map<string, number>();
const sessionStart = new Map<string, number>();
const seenAuthIds = new Set<string>();
const seenBehaviorKeys = new Set<string>();

function riskBand(score: number): VirtualSessionGhost['riskBand'] {
  if (score <= 30) return 'safe';
  if (score <= 60) return 'suspicious';
  return 'dangerous';
}

function pathToLabel(path: string): string {
  const p = path.split('?')[0] || '/';
  if (p === '/' || p === '') return 'Home';
  if (p.startsWith('/admin')) return 'Admin console';
  if (p.startsWith('/seller')) return 'Seller workspace';
  if (p.includes('/checkout')) return 'Checkout';
  if (p.includes('/cart')) return 'Cart';
  if (p.includes('/account')) return 'Account';
  if (p.includes('/messages')) return 'Messages';
  if (p.includes('/track')) return 'Order tracking';
  if (p.includes('/auth')) return 'Authentication';
  return p.slice(0, 48) || 'App';
}

function ghostFromPath(role: UserRole, path: string): VirtualSessionGhost['reconstructedUi'] {
  const label = pathToLabel(path);
  const sections: string[] = [];
  if (path.includes('/checkout')) sections.push('Payment step (card data never logged)');
  if (path.includes('/cart')) sections.push('Cart items · quantities');
  if (path.startsWith('/admin')) sections.push('Privileged routes · audit logged');
  if (path.startsWith('/seller')) sections.push('Inventory · orders · payouts');
  if (path.includes('/account')) sections.push('Profile & settings');
  return {
    title: `${label}`,
    sections: sections.length ? sections : ['Main content area', 'Navigation shell'],
    hints: [
      'Reconstructed from route + events only — not a screen capture.',
      'Sensitive fields are never transmitted to this panel.',
    ],
  };
}

function pushEvent(ev: Omit<SecurityActivityEvent, 'id' | 'at'> & { at?: string }) {
  const full: SecurityActivityEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: ev.at ?? new Date().toISOString(),
    role: ev.role,
    userId: ev.userId,
    severity: ev.severity,
    category: ev.category,
    title: ev.title,
    detail: ev.detail,
    meta: ev.meta,
  };
  activityRing.unshift(full);
  if (activityRing.length > MAX_EVENTS) activityRing.pop();
  const day = full.at.slice(0, 10);
  const b = dailyBuckets.get(day) ?? { events: 0, high: 0 };
  b.events += 1;
  if (ev.severity === 'high' || ev.severity === 'critical') b.high += 1;
  dailyBuckets.set(day, b);
  securityIntelBus.emit('activity', full);
}

function maybeAlert(userId: string | undefined, role: UserRole, score: number, title: string, detail: string) {
  let channels: SecurityAlertRow['channels'] = { email: false, sms: false, inapp: true };
  if (score >= 80) channels = { email: true, sms: true, inapp: true };
  else if (score >= 50) channels = { email: true, sms: false, inapp: true };

  const row: SecurityAlertRow = {
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    userId,
    role,
    title,
    detail,
    riskScore: score,
    channels,
  };
  alertHistory.unshift(row);
  if (alertHistory.length > MAX_ALERTS) alertHistory.pop();
  securityIntelBus.emit('alert', row);
}

function bumpRisk(userId: string, delta: number, reason: string, role: UserRole = 'buyer') {
  const prev = riskByUser.get(userId) ?? 0;
  const next = Math.max(0, Math.min(100, prev + delta));
  riskByUser.set(userId, next);
  if (next >= 50 && prev < 50) maybeAlert(userId, role, next, 'Risk elevated', reason);
  if (next >= 80 && prev < 80) maybeAlert(userId, role, next, 'Critical risk threshold', reason);
  return next;
}

export function ingestRequestBurst(userId: string, role: string | undefined, rpm: number) {
  const r = (role as UserRole) || 'buyer';
  const thresh = 80;
  if (rpm > thresh) {
    const score = bumpRisk(userId, Math.min(25, Math.floor((rpm - thresh) / 4)), `High request rate ~${rpm}/min`, r);
    pushEvent({
      role: r,
      userId,
      severity: score >= 60 ? 'high' : 'medium',
      category: 'suspicious',
      title: 'Rapid request burst',
      detail: `User ${userId.slice(-6)} exceeded benign RPM threshold`,
      meta: { rpm },
    });
  }
}

export function recordTelemetry(
  userId: string,
  role: UserRole,
  body: { path: string; action?: string; category?: string },
  ip: string,
  userAgent: string,
) {
  const now = Date.now();
  const last = lastTelemetryAt.get(userId) ?? 0;
  if (now - last < 1500) return;
  lastTelemetryAt.set(userId, now);
  if (!sessionStart.has(userId)) sessionStart.set(userId, now);

  const path = String(body.path || '/').slice(0, 512);
  const action = body.action || 'view';
  const cat = (body.category as SecurityActivityEvent['category']) || 'navigation';

  let severity: SecurityActivityEvent['severity'] = 'info';
  if (path.includes('/admin') && role !== 'admin') {
    severity = 'high';
    bumpRisk(userId, 35, 'Possible unauthorized admin route access', role);
    pushEvent({
      role,
      userId,
      severity: 'high',
      category: 'suspicious',
      title: 'Admin surface probe',
      detail: `Non-admin hit ${pathToLabel(path)}`,
    });
  } else if (path.includes('/checkout') || path.includes('/cart')) {
    pushEvent({
      role,
      userId,
      severity: 'low',
      category: 'commerce',
      title: `${pathToLabel(path)}`,
      detail: action,
    });
  } else {
    pushEvent({
      role,
      userId,
      severity: 'info',
      category: cat,
      title: `${pathToLabel(path)}`,
      detail: action,
    });
  }

  const ghost = sessionMap.get(userId) ?? {
    userId,
    role,
    currentRoute: '/',
    routeLabel: '—',
    lastActions: [],
    reconstructedUi: { title: '—', sections: [], hints: [] },
    maskedIdentifier: '—',
    deviceHint: '—',
    sessionStartedAt: new Date(sessionStart.get(userId) ?? now).toISOString(),
    lastSeenAt: new Date().toISOString(),
    riskScore: 0,
    riskBand: 'safe' as const,
  };

  ghost.currentRoute = path;
  ghost.routeLabel = pathToLabel(path);
  ghost.reconstructedUi = ghostFromPath(role, path);
  ghost.lastSeenAt = new Date().toISOString();
  ghost.maskedIdentifier = `User …${userId.slice(-6)}`;
  ghost.deviceHint = userAgent.slice(0, 80) || 'Unknown client';
  ghost.lastActions.unshift({
    at: new Date().toISOString(),
    type: action,
    detail: pathToLabel(path),
  });
  ghost.lastActions = ghost.lastActions.slice(0, SESSION_ACTIONS);
  ghost.riskScore = riskByUser.get(userId) ?? 0;
  ghost.riskBand = riskBand(ghost.riskScore);
  sessionMap.set(userId, ghost);
}

export function syncAuthMirror(
  authEvents: Array<{ id: string; type: string; role?: string; email?: string; ip: string; detail: string; at: string }>,
) {
  const recent = authEvents.slice(0, 25);
  for (const e of recent) {
    if (seenAuthIds.has(e.id)) continue;
    seenAuthIds.add(e.id);
    while (seenAuthIds.size > 400) {
      const first = seenAuthIds.values().next().value as string | undefined;
      if (first === undefined) break;
      seenAuthIds.delete(first);
    }
    if (e.type === 'LOGIN_FAIL') {
      pushEvent({
        role: 'guest',
        severity: 'medium',
        category: 'auth',
        title: 'Login failure',
        detail: `${e.detail} · ${e.ip}`,
      });
    } else if (e.type === 'ROLE_SIGNIN') {
      pushEvent({
        role: (e.role as UserRole) || 'buyer',
        severity: 'info',
        category: 'auth',
        title: 'Sign-in',
        detail: e.detail,
      });
    }
  }
}

export function syncBehaviorMirror(
  rows: Array<{ userId: string; role: UserRole; action: string; risk: string; status: string; detail: string; at: string }>,
) {
  for (const b of rows.slice(0, 20)) {
    const key = `${b.userId}|${b.at}|${b.action}`;
    if (seenBehaviorKeys.has(key)) continue;
    seenBehaviorKeys.add(key);
    while (seenBehaviorKeys.size > 500) {
      const first = seenBehaviorKeys.values().next().value as string | undefined;
      if (first === undefined) break;
      seenBehaviorKeys.delete(first);
    }
    if (b.status === 'FLAGGED' || b.risk === 'HIGH') {
      bumpRisk(b.userId, b.risk === 'HIGH' ? 22 : 12, b.detail, b.role);
    }
  }
}

export function logAdminSessionViewerAccess(adminId: string, targetUserId: string) {
  pushEvent({
    role: 'admin',
    userId: adminId,
    severity: 'low',
    category: 'session',
    title: 'Session viewer access',
    detail: `Admin ${adminId.slice(-6)} opened ghost session for ${targetUserId.slice(-6)}`,
    meta: { targetUserId },
  });
}

export function getIntelligenceSnapshot(): {
  liveCards: RoleLiveCard[];
  activity: SecurityActivityEvent[];
  sessions: VirtualSessionGhost[];
  riskSamples: Array<{ userId: string; role: UserRole; score: number; band: string }>;
  alerts: SecurityAlertRow[];
  weekly: WeeklySecurityStats;
  inAppUnread: number;
} {
  const connectedByRole = getConnectedUsersByRole();
  const sessions = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
  );

  const avgDur = (uid: string) => {
    const start = sessionStart.get(uid);
    if (!start) return 0;
    return Math.floor((Date.now() - start) / 1000);
  };

  const actionsForRole = (r: UserRole) =>
    activityRing.filter((e) => e.role === r).slice(0, 4).map((e) => e.title);

  const riskForRole = (r: UserRole): 'low' | 'medium' | 'high' => {
    const scores = sessions.filter((s) => s.role === r).map((s) => s.riskScore);
    const m = scores.length ? Math.max(...scores) : 0;
    if (m >= 61) return 'high';
    if (m >= 31) return 'medium';
    return 'low';
  };

  const liveCards: RoleLiveCard[] = [
    {
      role: 'buyer',
      onlineCount: connectedByRole.buyer,
      activeSessions: sessions.filter((s) => s.role === 'buyer').length,
      currentActions: actionsForRole('buyer'),
      riskIndicator: riskForRole('buyer'),
      avgSessionDurationSec: Math.round(
        sessions.filter((s) => s.role === 'buyer').reduce((a, s) => a + avgDur(s.userId), 0) /
          Math.max(1, sessions.filter((s) => s.role === 'buyer').length),
      ),
      topIpsSample: [],
    },
    {
      role: 'seller',
      onlineCount: connectedByRole.seller,
      activeSessions: sessions.filter((s) => s.role === 'seller').length,
      currentActions: actionsForRole('seller'),
      riskIndicator: riskForRole('seller'),
      avgSessionDurationSec: Math.round(
        sessions.filter((s) => s.role === 'seller').reduce((a, s) => a + avgDur(s.userId), 0) /
          Math.max(1, sessions.filter((s) => s.role === 'seller').length),
      ),
      topIpsSample: [],
    },
    {
      role: 'admin',
      onlineCount: connectedByRole.admin,
      activeSessions: connectedByRole.admin,
      currentActions: actionsForRole('admin'),
      riskIndicator: riskForRole('admin'),
      avgSessionDurationSec: 0,
      topIpsSample: [],
    },
  ];

  const riskSamples = Array.from(riskByUser.entries())
    .map(([userId, score]) => {
      const sess = sessionMap.get(userId);
      return {
        userId,
        role: (sess?.role ?? 'buyer') as UserRole,
        score,
        band: riskBand(score),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  const weekly = buildWeeklyStats();

  return {
    liveCards,
    activity: activityRing.slice(0, 120),
    sessions: sessions.slice(0, 80),
    riskSamples,
    alerts: alertHistory.slice(0, 80),
    weekly,
    inAppUnread: alertHistory.filter((a) => a.channels.inapp).length,
  };
}

function buildWeeklyStats(): WeeklySecurityStats {
  const days: WeeklySecurityStats['days'] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const b = dailyBuckets.get(key);
    days.push({ date: key, events: b?.events ?? 0, highSeverity: b?.high ?? 0 });
  }

  const topRiskyUsers = Array.from(riskByUser.entries())
    .map(([userId, score]) => ({
      userId,
      role: (sessionMap.get(userId)?.role ?? 'buyer') as UserRole,
      score,
      events: activityRing.filter((e) => e.userId === userId).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  let peakHour = 0;
  let peakVal = 0;
  for (let h = 0; h < 24; h++) {
    const c = activityRing.filter((e) => new Date(e.at).getUTCHours() === h && e.severity !== 'info').length;
    if (c > peakVal) {
      peakVal = c;
      peakHour = h;
    }
  }

  return {
    days,
    topRiskyUsers,
    blockedOrFlagged: activityRing.filter((e) => e.category === 'suspicious').length,
    peakSuspiciousHourUtc: peakVal > 0 ? peakHour : null,
  };
}
