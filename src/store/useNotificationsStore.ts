import { create } from 'zustand';

export type NotificationType = 'task' | 'bill' | 'goal' | 'health' | 'family' | 'ai' | 'emergency' | 'achievement';

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
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],

  addNotification: (n) =>
    set((s) => ({
      notifications: [{ ...n, id: generateId(), createdAt: new Date().toISOString() }, ...s.notifications],
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  deleteNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  clearAll: () => set({ notifications: [] }),

  seedDemoData: () => {
    const now = new Date();
    const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

    set({
      notifications: [
        { id: 'n1', type: 'bill', title: '💳 Bill Due in 3 Days', body: 'Car Insurance payment of $185 is due on June 23rd. Set up autopay to avoid late fees.', isRead: false, action: { label: 'View Bill', route: 'Finance' }, createdAt: ago(5) },
        { id: 'n2', type: 'achievement', title: '🏆 Achievement Unlocked!', body: "Aiden earned the \"Task Master\" badge — completed 10 tasks in a row! That's a new family record!", isRead: false, memberId: 'member-3', createdAt: ago(32) },
        { id: 'n3', type: 'ai', title: '📊 Weekly Report Ready', body: "Your family's weekly performance report is ready. Family Health Score improved by 4 points this week!", isRead: false, action: { label: 'View Report', route: 'WeeklyReport' }, createdAt: ago(120) },
        { id: 'n4', type: 'task', title: '⏰ Task Overdue', body: 'Car oil change is 3 weeks overdue. Schedule service soon to avoid engine damage.', isRead: true, action: { label: 'View Tasks', route: 'Family' }, createdAt: ago(300) },
        { id: 'n5', type: 'goal', title: '🎯 Goal 50% Reached!', body: "You've saved $4,000 of your $8,000 Hawaii vacation fund! Keep it up — 9 months ahead of schedule!", isRead: true, action: { label: 'View Goals', route: 'Finance' }, createdAt: ago(1440) },
        { id: 'n6', type: 'health', title: '💊 Medication Reminder', body: "Sarah's prescription refill is due this week. Don't forget to pick it up from the pharmacy!", isRead: true, memberId: 'member-1', createdAt: ago(2880) },
        { id: 'n7', type: 'family', title: '📅 Family Meeting Tonight', body: 'Weekly family meeting at 7 PM. Agenda: Summer vacation plans & chore rotation update.', isRead: true, createdAt: ago(4320) },
        { id: 'n8', type: 'emergency', title: '🚨 Emergency Contact Updated', body: 'Grandma Rosa has been added as an emergency contact for Aiden and Lily.', isRead: true, createdAt: ago(7200) },
      ],
    });
  },
}));
