import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NormalizedNotification, NotificationFilterId } from './types';
import { normalizeList } from './normalize';
import type { RawBuyerNotification } from './types';

const STALE_MS = 90_000;

interface NotificationHubState {
  items: NormalizedNotification[];
  loaded: boolean;
  loading: boolean;
  lastFetch: number;
  activeFilter: NotificationFilterId;
  drawerScrollTop: number;
  centerScrollTop: number;
  searchQuery: string;
  setFilter: (f: NotificationFilterId) => void;
  setSearch: (q: string) => void;
  setDrawerScroll: (y: number) => void;
  setCenterScroll: (y: number) => void;
  setItems: (rows: RawBuyerNotification[]) => void;
  prependRealtime: (row: RawBuyerNotification) => void;
  setLoading: (v: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  needsRefresh: () => boolean;
  unreadCount: () => number;
}

export const useNotificationHubStore = create<NotificationHubState>()(
  persist(
    (set, get) => ({
      items: [],
      loaded: false,
      loading: false,
      lastFetch: 0,
      activeFilter: 'all',
      drawerScrollTop: 0,
      centerScrollTop: 0,
      searchQuery: '',

      setFilter: (activeFilter) => set({ activeFilter }),
      setSearch: (searchQuery) => set({ searchQuery }),
      setDrawerScroll: (drawerScrollTop) => set({ drawerScrollTop }),
      setCenterScroll: (centerScrollTop) => set({ centerScrollTop }),

      setItems: (rows) =>
        set({
          items: normalizeList(rows),
          loaded: true,
          loading: false,
          lastFetch: Date.now(),
        }),

      prependRealtime: (row) =>
        set((s) => {
          const next = normalizeList([row, ...s.items.filter((i) => i.id !== row.id)]).slice(0, 120);
          return { items: next, loaded: true, lastFetch: Date.now() };
        }),

      setLoading: (loading) => set({ loading }),

      markRead: (id) =>
        set((s) => ({
          items: s.items.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        })),

      markAllRead: () =>
        set((s) => ({
          items: s.items.map((n) => ({ ...n, unread: false })),
        })),

      remove: (id) =>
        set((s) => ({
          items: s.items.filter((n) => n.id !== id),
        })),

      needsRefresh: () => {
        const { loaded, lastFetch } = get();
        return !loaded || Date.now() - lastFetch > STALE_MS;
      },

      unreadCount: () => get().items.filter((n) => n.unread).length,
    }),
    {
      name: 'reaglex-notification-hub',
      partialize: (s) => ({
        items: s.items,
        loaded: s.loaded,
        lastFetch: s.lastFetch,
        activeFilter: s.activeFilter,
        drawerScrollTop: s.drawerScrollTop,
        centerScrollTop: s.centerScrollTop,
      }),
    },
  ),
);
