import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailySnapshot {
  date: string;
  overall: number;
  financial: number;
  productivity: number;
  safety: number;
  home: number;
  wellness: number;
}

interface DigitalTwinState {
  snapshots: DailySnapshot[];
  recordSnapshot: (snapshot: Omit<DailySnapshot, 'date'>) => void;
  getTrend: () => number;
  getHistory: (days: number) => DailySnapshot[];
}

export const useDigitalTwinStore = create<DigitalTwinState>()(
  persist(
    (set, get) => ({
      snapshots: [],

      recordSnapshot: (data) => {
        const date = new Date().toISOString().slice(0, 10);
        set((s) => {
          const existing = s.snapshots.findIndex((snap) => snap.date === date);
          if (existing >= 0) {
            const updated = [...s.snapshots];
            updated[existing] = { date, ...data };
            return { snapshots: updated };
          }
          const trimmed = s.snapshots.slice(-29);
          return { snapshots: [...trimmed, { date, ...data }] };
        });
      },

      getTrend: () => {
        const snaps = get().snapshots;
        if (snaps.length < 2) return 0;
        const recent = snaps.slice(-7);
        if (recent.length < 2) return 0;
        const first = recent[0].overall;
        const last = recent[recent.length - 1].overall;
        return last - first;
      },

      getHistory: (days) => {
        const snaps = get().snapshots;
        return snaps.slice(-days);
      },
    }),
    { name: 'digital-twin-v1', storage: createJSONStorage(() => AsyncStorage) }
  )
);
