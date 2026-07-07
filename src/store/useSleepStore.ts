import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

const generateId = () => Math.random().toString(36).substring(2, 11);

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
  addLog: (l) => set((s) => ({ logs: [{ ...l, id: generateId(), createdAt: new Date().toISOString() }, ...s.logs] })),
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
