import { useCallback, useEffect, useMemo } from 'react';
import { buyerNotificationsApi } from '../services/buyerNotificationsApi';
import { websocketService } from '../services/websocketService';
import { useNotificationHubStore } from './notificationHubStore';
import type { RawBuyerNotification } from './types';

/** Warm cache so opening the drawer feels instant. */
export function prefetchNotificationHub() {
  const state = useNotificationHubStore.getState();
  if (!state.needsRefresh()) return;
  if (state.items.length === 0) state.setLoading(true);
  buyerNotificationsApi
    .getNotifications(80)
    .then((data) => {
      const rows = Array.isArray(data?.notifications) ? data.notifications : [];
      useNotificationHubStore.getState().setItems(rows);
    })
    .catch(() => {
      if (!useNotificationHubStore.getState().loaded) {
        useNotificationHubStore.getState().setItems([]);
      }
    });
}

function systemPayloadToRow(data: {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}): RawBuyerNotification {
  return {
    id: `system:${data.notificationId}`,
    type: 'system',
    title: data.title,
    message: data.message,
    time: 'Just now',
    createdAt: data.createdAt,
    unread: true,
  };
}

export function useNotificationHub(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const items = useNotificationHubStore((s) => s.items);
  const loaded = useNotificationHubStore((s) => s.loaded);
  const loading = useNotificationHubStore((s) => s.loading);
  const activeFilter = useNotificationHubStore((s) => s.activeFilter);
  const drawerScrollTop = useNotificationHubStore((s) => s.drawerScrollTop);
  const centerScrollTop = useNotificationHubStore((s) => s.centerScrollTop);
  const searchQuery = useNotificationHubStore((s) => s.searchQuery);
  const setFilter = useNotificationHubStore((s) => s.setFilter);
  const setSearch = useNotificationHubStore((s) => s.setSearch);
  const setDrawerScroll = useNotificationHubStore((s) => s.setDrawerScroll);
  const setCenterScroll = useNotificationHubStore((s) => s.setCenterScroll);
  const setLoading = useNotificationHubStore((s) => s.setLoading);
  const setItems = useNotificationHubStore((s) => s.setItems);
  const prependRealtime = useNotificationHubStore((s) => s.prependRealtime);
  const markReadStore = useNotificationHubStore((s) => s.markRead);
  const markAllReadStore = useNotificationHubStore((s) => s.markAllRead);
  const remove = useNotificationHubStore((s) => s.remove);
  const needsRefresh = useNotificationHubStore((s) => s.needsRefresh);

  const hydrate = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (!force && !needsRefresh()) return;
      if (useNotificationHubStore.getState().items.length === 0) setLoading(true);
      try {
        const data = await buyerNotificationsApi.getNotifications(80);
        const rows = Array.isArray(data?.notifications) ? data.notifications : [];
        setItems(rows);
      } catch {
        if (!useNotificationHubStore.getState().loaded) setItems([]);
      }
    },
    [enabled, needsRefresh, setItems, setLoading],
  );

  useEffect(() => {
    if (!enabled) return undefined;
    hydrate();

    const prev = websocketService.onSystemInboxNotification;
    websocketService.onSystemInboxNotification = (payload) => {
      prependRealtime(systemPayloadToRow(payload));
      prev?.(payload);
    };

    return () => {
      websocketService.onSystemInboxNotification = prev;
    };
  }, [enabled, hydrate, prependRealtime]);

  const markRead = useCallback(
    (id: string, row?: RawBuyerNotification) => {
      markReadStore(id);
      if (row?.type === 'system' && typeof id === 'string' && id.startsWith('system:')) {
        buyerNotificationsApi.markSystemNotificationRead(id).catch(() => {});
      }
    },
    [markReadStore],
  );

  const markAllRead = useCallback(() => {
    items
      .filter((n) => n.unread && n.type === 'system' && String(n.id).startsWith('system:'))
      .forEach((n) => buyerNotificationsApi.markSystemNotificationRead(n.id).catch(() => {}));
    markAllReadStore();
  }, [items, markAllReadStore]);

  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items]);

  return {
    items,
    loaded,
    loading,
    activeFilter,
    drawerScrollTop,
    centerScrollTop,
    searchQuery,
    setFilter,
    setSearch,
    setDrawerScroll,
    setCenterScroll,
    hydrate,
    markRead,
    markAllRead,
    remove,
    unreadCount,
  };
}
