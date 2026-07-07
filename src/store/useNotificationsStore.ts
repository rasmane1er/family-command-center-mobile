import { enqueueSync } from '../sync/enqueueSync';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as Notifications from 'expo-notifications';

let hasRequestedNotificationPermission = false;

// Local (on-device) notification — no backend/Firebase needed, unlike
// Guardian's push-token flow which is blocked on infra that doesn't exist
// yet. Best-effort: silently no-ops if permission is denied or this is
// running somewhere notifications aren't supported (e.g. web).
async function fireLocalNotification(title: string, body: string) {
  try {
    if (!hasRequestedNotificationPermission) {
      hasRequestedNotificationPermission = true;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') await Notifications.requestPermissionsAsync();
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // best-effort
  }
}

export type NotificationType = 'task' | 'bill' | 'goal' | 'health' | 'family' | 'ai' | 'emergency' | 'achievement' | 'school';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  action?: { label: string; route: string };
  createdAt: string;
  memberId?: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  isLoaded: boolean;
  // Source keys (e.g. `bill-overdue-${billId}`) already notified about, so
  // a periodic scanner (useNotificationTriggers.ts) doesn't recreate the
  // same notification every time it re-scans.
  notifiedSourceKeys: string[];
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt'>) => void;
  hasBeenNotified: (sourceKey: string) => boolean;
  markNotified: (sourceKey: string) => void;
  clearNotified: (sourceKey: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  fetchFromServer: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
  notifications: [],
  notifiedSourceKeys: [],
  isLoaded: false,

  addNotification: (n) => {
  const notification = {
    ...n,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  set((s) => ({
    notifications: [notification, ...s.notifications],
  }));

  fireLocalNotification(notification.title, notification.body);

  enqueueSync({
    entity: 'notifications',
    action: 'create',
    payload: { type: 'notification', data: notification },
  });
},

  hasBeenNotified: (sourceKey) => get().notifiedSourceKeys.includes(sourceKey),

  markNotified: (sourceKey) =>
    set((s) => (s.notifiedSourceKeys.includes(sourceKey)
      ? s
      : { notifiedSourceKeys: [...s.notifiedSourceKeys, sourceKey] })),

  clearNotified: (sourceKey) =>
    set((s) => ({ notifiedSourceKeys: s.notifiedSourceKeys.filter((k) => k !== sourceKey) })),

  markRead: (id) => {
  set((s) => ({
    notifications: s.notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    ),
  }));

  enqueueSync({
    entity: 'notifications',
    action: 'update',
    payload: { type: 'notification', id, updates: { isRead: true } },
  });
},

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  deleteNotification: (id) => {
  set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id),
  }));

  enqueueSync({
    entity: 'notifications',
    action: 'delete',
    payload: { type: 'notification', id },
  });
},

  clearAll: () => set({ notifications: [] }),

  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-notifications',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        notifiedSourceKeys: state.notifiedSourceKeys,
      }),
    }
  )
);
