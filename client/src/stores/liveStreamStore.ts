import { create } from 'zustand';

export type LiveViewMode = 'inline' | 'floating' | 'pip' | 'hidden';

export type LiveSessionMeta = {
  id: string;
  title?: string;
  subtitle?: string;
  status?: string;
  streamProvider?: string;
  playbackUrl?: string;
  seller?: { id?: string; name?: string };
  features?: Record<string, boolean>;
};

export type LiveStreamUiState = {
  active: boolean;
  sessionId: string | null;
  session: LiveSessionMeta | null;
  viewMode: LiveViewMode;
  minimized: boolean;
  muted: boolean;
  webrtcStatus: string;
  connectionError: string | null;
  viewerCount: number;
  pinnedProduct: Record<string, unknown> | null;
  chatMessages: unknown[];
  reactions: unknown[];
  chatEnabled: boolean;
  /** Bumped when remote MediaStream gains/loses tracks (forces React refresh). */
  streamRevision: number;
};

type LiveStreamActions = {
  reset: () => void;
  setSession: (session: LiveSessionMeta | null) => void;
  setViewMode: (mode: LiveViewMode) => void;
  setMinimized: (minimized: boolean) => void;
  setMuted: (muted: boolean) => void;
  setWebrtcStatus: (status: string) => void;
  setConnectionError: (error: string | null) => void;
  patchLiveData: (patch: Partial<LiveStreamUiState>) => void;
  closePlayer: () => void;
};

const INITIAL: LiveStreamUiState = {
  active: false,
  sessionId: null,
  session: null,
  viewMode: 'hidden',
  minimized: false,
  muted: true,
  webrtcStatus: 'idle',
  connectionError: null,
  viewerCount: 0,
  pinnedProduct: null,
  chatMessages: [],
  reactions: [],
  chatEnabled: true,
  streamRevision: 0,
};

export const useLiveStreamStore = create<LiveStreamUiState & LiveStreamActions>((set) => ({
  ...INITIAL,
  reset: () => set({ ...INITIAL }),
  setSession: (session) =>
    set({
      active: Boolean(session?.id),
      sessionId: session?.id ?? null,
      session,
      viewMode: session?.id ? 'inline' : 'hidden',
      minimized: false,
      connectionError: null,
    }),
  setViewMode: (viewMode) => set({ viewMode }),
  setMinimized: (minimized) =>
    set((s) => ({
      minimized,
      viewMode: minimized ? 'floating' : s.active ? 'inline' : 'hidden',
    })),
  setMuted: (muted) => set({ muted }),
  setWebrtcStatus: (webrtcStatus) => set({ webrtcStatus }),
  setConnectionError: (connectionError) => set({ connectionError }),
  patchLiveData: (patch) => set((s) => ({ ...s, ...patch })),
  closePlayer: () => set({ ...INITIAL }),
}));
