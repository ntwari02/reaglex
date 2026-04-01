export type IntelRole = 'buyer' | 'seller' | 'admin';

export interface LiveRoleCard {
  role: IntelRole;
  onlineCount: number;
  activeSessions: number;
  currentActions: string[];
  riskIndicator: 'low' | 'medium' | 'high';
  avgSessionDurationSec: number;
  topIpsSample: string[];
}

export interface IntelActivityEvent {
  id: string;
  at: string;
  role: string;
  userId?: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  detail: string;
}

export interface VirtualSessionGhost {
  userId: string;
  role: string;
  currentRoute: string;
  routeLabel: string;
  lastActions: Array<{ at: string; type: string; detail: string }>;
  reconstructedUi: { title: string; sections: string[]; hints: string[] };
  maskedIdentifier: string;
  deviceHint: string;
  userAgentFull?: string;
  ipAddress?: string;
  sessionStartedAt: string;
  lastSeenAt: string;
  riskScore: number;
  riskBand: 'safe' | 'suspicious' | 'dangerous';
}

/** Admin-only detail from GET /security-analysis/session-subject/:userId */
export interface SessionSubjectDetail {
  account: {
    fullName: string;
    email: string;
    phoneMasked: string | null;
    role: string;
    accountStatus?: string;
    emailVerified: boolean;
    profileLocation?: string;
    memberSince: string;
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    lastLoginLocation?: string;
    lastLoginDevice?: string;
  } | null;
  session: {
    userId: string;
    currentRoute: string;
    routeLabel: string;
    riskScore: number;
    riskBand: string;
    ipAddress?: string;
    geoLabel: string;
    userAgentFull?: string;
    deviceSummary: string;
    sessionStartedAt: string;
    lastSeenAt: string;
  } | null;
}

export interface RiskSample {
  userId: string;
  role: string;
  score: number;
  band: string;
}

export interface SecurityAlertRow {
  id: string;
  at: string;
  userId?: string;
  role?: string;
  title: string;
  detail: string;
  riskScore: number;
  channels: { email: boolean; sms: boolean; inapp: boolean };
}

export interface WeeklySecurityStats {
  days: Array<{ date: string; events: number; highSeverity: number }>;
  topRiskyUsers: Array<{ userId: string; role: string; score: number; events: number }>;
  blockedOrFlagged: number;
  peakSuspiciousHourUtc: number | null;
}

export interface IntelligenceBundle {
  liveCards: LiveRoleCard[];
  activity: IntelActivityEvent[];
  sessions: VirtualSessionGhost[];
  riskSamples: RiskSample[];
  alerts: SecurityAlertRow[];
  weekly: WeeklySecurityStats;
  inAppUnread: number;
  ts?: string;
}
