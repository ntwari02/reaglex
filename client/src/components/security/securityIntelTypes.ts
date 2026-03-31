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
  sessionStartedAt: string;
  lastSeenAt: string;
  riskScore: number;
  riskBand: 'safe' | 'suspicious' | 'dangerous';
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
