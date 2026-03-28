import { create } from 'zustand';

interface SecurityOverview {
  score: number;
  grade: string;
  findingsSummary: { critical: number; high: number; medium: number; low: number; pass: number };
  lastScanAt: string | null;
  mttdHours: number;
  mttrHours: number;
  subScores: Record<string, number>;
}

interface SecurityAnalysisUiState {
  overview: SecurityOverview | null;
  findings: Array<{
    id: string;
    severity: string;
    title: string;
    component: string;
    cveId?: string;
    cvss?: number;
    status: string;
    firstDetected: string;
  }>;
  surfaceNodes: Array<{
    id: string;
    label: string;
    ring: string;
    severity: string;
    shortLabel: string;
  }>;
  events: Array<{ id: string; type: string; title: string; description: string; actor: string; at: string }>;
  compliance: Array<{ id: string; title: string; status: string; description: string }>;
  setOverview: (o: SecurityOverview | null) => void;
  setFindings: (f: SecurityAnalysisUiState['findings']) => void;
  setSurface: (n: SecurityAnalysisUiState['surfaceNodes']) => void;
  setEvents: (e: SecurityAnalysisUiState['events']) => void;
  setCompliance: (c: SecurityAnalysisUiState['compliance']) => void;
}

export const useSecurityAnalysisUiStore = create<SecurityAnalysisUiState>((set) => ({
  overview: null,
  findings: [],
  surfaceNodes: [],
  events: [],
  compliance: [],
  setOverview: (overview) => set({ overview }),
  setFindings: (findings) => set({ findings }),
  setSurface: (surfaceNodes) => set({ surfaceNodes }),
  setEvents: (events) => set({ events }),
  setCompliance: (compliance) => set({ compliance }),
}));
