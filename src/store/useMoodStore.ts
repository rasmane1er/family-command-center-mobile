import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  memberId: string;
  level: MoodLevel;
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

interface MoodState {
  entries: MoodEntry[];
  isLoaded: boolean;
  addMoodEntry: (entry: Omit<MoodEntry, 'id' | 'createdAt'>) => void;
  deleteMoodEntry: (id: string) => void;
  getTodayMood: (memberId: string) => MoodEntry | undefined;
  getMemberHistory: (memberId: string, days: number) => MoodEntry[];
  getFamilyAvgToday: () => number;
  fetchFromServer: () => Promise<void>;
}

import { generateId } from '../utils/generateId';
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

// This store has no server sync (fetchFromServer is a no-op below), so the
// local addMoodEntry cap is the only thing bounding its persisted size —
// same convention as useTimelineStore.ts.
const MAX_ENTRIES = 2000;

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
  entries: [],
  isLoaded: false,

  addMoodEntry: (entry) => {
    const { entries } = get();
    const filtered = entries.filter((e) => !(e.memberId === entry.memberId && e.date === entry.date));
    const next = [...filtered, { ...entry, id: generateId(), createdAt: new Date().toISOString() }]
      .sort((a, b) => b.date.localeCompare(a.date));
    set({ entries: next.slice(0, MAX_ENTRIES) });
  },

  deleteMoodEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

  getTodayMood: (memberId) => {
    const today = toDateStr(new Date());
    return get().entries.find((e) => e.memberId === memberId && e.date === today);
  },

  getMemberHistory: (memberId, days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return get().entries
      .filter((e) => e.memberId === memberId && new Date(e.date) >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getFamilyAvgToday: () => {
    const today = toDateStr(new Date());
    const dayEntries = get().entries.filter((e) => e.date === today);
    if (dayEntries.length === 0) return 0;
    return dayEntries.reduce((s, e) => s + e.level, 0) / dayEntries.length;
  },

  fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-mood',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
