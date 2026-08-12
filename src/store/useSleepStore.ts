import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

import { generateId } from '../utils/generateId';

// Same unbounded-append-log gap fixed elsewhere (useNotificationsStore,
// useJournalStore, etc.) — one entry per night accumulates indefinitely
// otherwise (1000 ≈ ~3 years for one member).
const MAX_LOGS = 1000;

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export interface SleepLog {
  id: string;
  familyId: string;
  memberId: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  durationHours: number;
  quality: SleepQuality;
  notes?: string;
  createdAt: string;
}

interface SleepState {
  logs: SleepLog[];
  isLoaded: boolean;
  addLog: (l: Omit<SleepLog, 'id' | 'createdAt'>) => void;
  deleteLog: (id: string) => void;
  getAverageSleep: (memberId: string) => number;
  fetchFromServer: () => Promise<void>;
}

export const useSleepStore = create<SleepState>()(
  persist(
    (set, get) => ({
  logs: [],
  isLoaded: false,
  addLog: (l) => set((s) => ({ logs: [{ ...l, id: generateId(), createdAt: new Date().toISOString() }, ...s.logs].slice(0, MAX_LOGS) })),
  deleteLog: (id) => set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
  getAverageSleep: (memberId) => {
    const memberLogs = get().logs.filter((l) => l.memberId === memberId).slice(0, 7);
    if (memberLogs.length === 0) return 0;
    return memberLogs.reduce((s, l) => s + l.durationHours, 0) / memberLogs.length;
  },
  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-sleep',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
