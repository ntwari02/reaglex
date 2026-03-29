import { create } from 'zustand';

export interface HealthState {
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  networkLoadPercent?: number;
  memoryPressurePercent?: number;
  diskIoActivityPercent?: number;
  uptimeSeconds: number;
  status: 'OK' | 'WARN' | 'CRITICAL';
  cpuTrend?: number[];
  globalRequestsPerSecond?: number;
}

export interface ApiRow {
  endpoint: string;
  method?: string;
  avgResponseMs: number;
  requests: number;
  errors: number;
  errorRatePercent?: number;
  rps?: number;
  uptimePercent: number;
  lastStatus: 'OK' | 'ERROR';
  lastMs?: number;
  statusCodes?: Record<string, number>;
  lastClientIp?: string;
  lastUserAgent?: string;
  lastPayloadBytes?: number;
}

export interface ActivityRow {
  id: string;
  method: string;
  path: string;
  ms: number;
  status: number;
  at: string;
  clientIp?: string;
}

export interface AlertRow {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  at: string;
}

export interface GlobalStatus {
  label: string;
  level: 'operational' | 'degraded' | 'outage';
  detail: string;
}

interface SystemAnalysisUiState {
  health: HealthState | null;
  endpoints: ApiRow[];
  activity: ActivityRow[];
  alerts: AlertRow[];
  globalStatus: GlobalStatus | null;
  buckets24h: number[];
  terminals: Record<string, string[]>;
  logs: Array<{ id: string; level: string; message: string; at: string }>;
  settings: {
    monitoringEnabled: boolean;
    cpuWarn: number;
    cpuCritical: number;
    sensitivity: string;
    apiSlowWarnMs?: number;
    apiSlowCriticalMs?: number;
  } | null;
  logFilter: 'all' | 'error' | 'warning' | 'info';
  setHealth: (h: HealthState | null) => void;
  setEndpoints: (e: ApiRow[]) => void;
  setActivity: (a: ActivityRow[]) => void;
  setAlerts: (a: AlertRow[]) => void;
  setGlobalStatus: (g: GlobalStatus | null) => void;
  setBuckets24h: (b: number[]) => void;
  setTerminals: (t: Record<string, string[]>) => void;
  setLogs: (l: SystemAnalysisUiState['logs']) => void;
  prependLog: (l: SystemAnalysisUiState['logs'][0]) => void;
  prependActivity: (row: ActivityRow) => void;
  setSettings: (s: SystemAnalysisUiState['settings']) => void;
  setLogFilter: (f: SystemAnalysisUiState['logFilter']) => void;
  applyBundle: (b: {
    health: HealthState;
    endpoints: ApiRow[];
    activity: ActivityRow[];
    alerts: AlertRow[];
    status: GlobalStatus;
    buckets24h: number[];
    terminals: Record<string, string[]>;
    logs?: SystemAnalysisUiState['logs'];
  }) => void;
}

export const useSystemAnalysisUiStore = create<SystemAnalysisUiState>((set) => ({
  health: null,
  endpoints: [],
  activity: [],
  alerts: [],
  globalStatus: null,
  buckets24h: [],
  terminals: {},
  logs: [],
  settings: null,
  logFilter: 'all',
  setHealth: (health) => set({ health }),
  setEndpoints: (endpoints) => set({ endpoints }),
  setActivity: (activity) => set({ activity }),
  setAlerts: (alerts) => set({ alerts }),
  setGlobalStatus: (globalStatus) => set({ globalStatus }),
  setBuckets24h: (buckets24h) => set({ buckets24h }),
  setTerminals: (terminals) => set({ terminals }),
  setLogs: (logs) => set({ logs }),
  prependLog: (entry) =>
    set((s) => ({
      logs: [entry, ...s.logs].slice(0, 200),
    })),
  prependActivity: (row) =>
    set((s) => ({
      activity: [row, ...s.activity.filter((x) => x.id !== row.id)].slice(0, 200),
    })),
  setSettings: (settings) => set({ settings }),
  setLogFilter: (logFilter) => set({ logFilter }),
  applyBundle: (b) =>
    set({
      health: b.health,
      endpoints: b.endpoints,
      activity: b.activity,
      alerts: b.alerts,
      globalStatus: b.status,
      buckets24h: b.buckets24h,
      terminals: b.terminals,
      ...(b.logs ? { logs: b.logs } : {}),
    }),
}));
