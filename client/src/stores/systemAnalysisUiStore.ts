import { create } from 'zustand';

export interface HealthState {
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  uptimeSeconds: number;
  status: 'OK' | 'WARN' | 'CRITICAL';
}

interface SystemAnalysisUiState {
  health: HealthState | null;
  endpoints: Array<{
    endpoint: string;
    avgResponseMs: number;
    requests: number;
    errors: number;
    uptimePercent: number;
    lastStatus: 'OK' | 'ERROR';
  }>;
  behavior: Array<{
    userId: string;
    role: string;
    action: string;
    risk: string;
    status: string;
    detail: string;
    at: string;
  }>;
  logs: Array<{ id: string; level: string; message: string; at: string }>;
  settings: {
    monitoringEnabled: boolean;
    cpuWarn: number;
    cpuCritical: number;
    sensitivity: string;
  } | null;
  logFilter: 'all' | 'error' | 'warning' | 'info';
  setHealth: (h: HealthState | null) => void;
  setEndpoints: (e: SystemAnalysisUiState['endpoints']) => void;
  setBehavior: (b: SystemAnalysisUiState['behavior']) => void;
  setLogs: (l: SystemAnalysisUiState['logs']) => void;
  prependLog: (l: SystemAnalysisUiState['logs'][0]) => void;
  setSettings: (s: SystemAnalysisUiState['settings']) => void;
  setLogFilter: (f: SystemAnalysisUiState['logFilter']) => void;
}

export const useSystemAnalysisUiStore = create<SystemAnalysisUiState>((set) => ({
  health: null,
  endpoints: [],
  behavior: [],
  logs: [],
  settings: null,
  logFilter: 'all',
  setHealth: (health) => set({ health }),
  setEndpoints: (endpoints) => set({ endpoints }),
  setBehavior: (behavior) => set({ behavior }),
  setLogs: (logs) => set({ logs }),
  prependLog: (entry) =>
    set((s) => ({
      logs: [entry, ...s.logs].slice(0, 200),
    })),
  setSettings: (settings) => set({ settings }),
  setLogFilter: (logFilter) => set({ logFilter }),
}));
