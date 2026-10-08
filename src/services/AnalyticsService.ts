import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEvent =
  | 'app_open'
  | 'screen_view'
  | 'task_complete'
  | 'bill_marked_paid'
  | 'budget_viewed'
  | 'ai_message_sent'
  | 'notification_tapped'
  | 'goal_progress_updated'
  | 'medication_logged'
  | 'habit_completed'
  | 'search_performed'
  | 'weekly_report_viewed'
  | 'pin_setup'
  | 'biometric_auth'
  | 'data_exported';

interface AnalyticsRecord {
  event: AnalyticsEvent;
  props?: Record<string, unknown>;
  ts: number;
}

const STORAGE_KEY = 'analytics-events';
const MAX_STORED = 200;

let queue: AnalyticsRecord[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: AnalyticsRecord[] = raw ? JSON.parse(raw) : [];
    const combined = [...existing, ...batch].slice(-MAX_STORED);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
  } catch {
    // local analytics failure is non-fatal
  }
}

export const Analytics = {
  track(event: AnalyticsEvent, props?: Record<string, unknown>) {
    queue.push({ event, props, ts: Date.now() });
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 3000);
  },

  async getEvents(): Promise<AnalyticsRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async getSummary(): Promise<Record<AnalyticsEvent, number>> {
    const events = await Analytics.getEvents();
    return events.reduce((acc, r) => {
      acc[r.event] = (acc[r.event] ?? 0) + 1;
      return acc;
    }, {} as Record<AnalyticsEvent, number>);
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    queue = [];
  },
};
