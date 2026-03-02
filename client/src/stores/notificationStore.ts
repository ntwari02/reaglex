import { create } from 'zustand';

interface NotificationState {
  unreadMessageCount: number;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setUnreadCount: (count: number) => void;
  resetUnreadCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadMessageCount: 0,
  incrementUnreadCount: () => set((state) => ({ unreadMessageCount: state.unreadMessageCount + 1 })),
  decrementUnreadCount: () => set((state) => ({ unreadMessageCount: Math.max(0, state.unreadMessageCount - 1) })),
  setUnreadCount: (count: number) => set({ unreadMessageCount: count }),
  resetUnreadCount: () => set({ unreadMessageCount: 0 }),
}));

